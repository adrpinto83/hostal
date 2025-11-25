# app/services/network_integrations/openwrt.py
"""
Integración con routers OpenWrt usando la API RPC de LuCI.
Permite bloquear/desbloquear MACs actualizando la lista negra
de interfaces WiFi y ejecutando comandos del sistema.
"""
from __future__ import annotations

import aiohttp
import asyncio
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from ...models import NetworkDevice
from .base import NetworkIntegrationBase

logger = logging.getLogger(__name__)


class OpenWrtIntegration(NetworkIntegrationBase):
    """
    Integración con OpenWrt mediante LuCI RPC (`/cgi-bin/luci/rpc`).

    Requiere:
    - Usuario/contraseña válidos en LuCI
    - Puerto del servidor uhttpd (80/443 por defecto)
    - Interface WiFi objetivo en `network_interface` (por ejemplo `@wifi-iface[0]` o `wifinet0`)
    """

    def __init__(self, device: NetworkDevice, db: Session):
        super().__init__(device, db)
        protocol = "https" if device.use_ssl else "http"
        port = device.port or (443 if device.use_ssl else 80)
        self.base_url = f"{protocol}://{device.ip_address}:{port}/cgi-bin/luci/rpc"
        self.username = device.username or "root"
        self.password = device.password or ""
        self.timeout = aiohttp.ClientTimeout(total=device.timeout_seconds or 30)
        self.session_token: Optional[str] = None

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    async def _ensure_token(self) -> bool:
        """Autentica contra LuCI y almacena el token sysauth."""
        if self.session_token:
            return True

        payload = {
            "id": 1,
            "method": "login",
            "params": [self.username, self.password],
        }
        url = f"{self.base_url}/auth"

        connector_kwargs = {}
        if not self.device.verify_ssl:
            connector_kwargs["ssl"] = False

        try:
            async with aiohttp.ClientSession(
                connector=aiohttp.TCPConnector(**connector_kwargs) if connector_kwargs else None,
                timeout=self.timeout,
            ) as session:
                async with session.post(url, json=payload) as response:
                    if response.status != 200:
                        logger.error("openwrt_auth_failed", status=response.status)
                        return False

                    data = await response.json()
                    result = data.get("result")
                    if isinstance(result, list) and len(result) > 1 and result[0] == 0:
                        self.session_token = result[1]
                        return True

                    # Algunas versiones responden directamente con string
                    if isinstance(result, str):
                        self.session_token = result
                        return True

                    logger.error("openwrt_auth_no_token", response=data)
                    return False
        except asyncio.TimeoutError:
            logger.error("openwrt_auth_timeout", url=url)
            return False
        except Exception as exc:
            logger.error("openwrt_auth_error", error=str(exc))
            return False

    async def _request(
        self,
        service: str,
        method: str,
        params: Optional[List[Any]] = None,
        allow_retry: bool = True,
    ) -> Tuple[bool, Any]:
        """Realiza una llamada RPC a LuCI."""
        params = params or []

        if not await self._ensure_token():
            return False, None

        payload = {
            "id": 1,
            "method": method,
            "params": params,
        }
        url = f"{self.base_url}/{service}"
        headers = {"Content-Type": "application/json"}
        cookies = {"sysauth": self.session_token} if self.session_token else None

        connector_kwargs = {}
        if not self.device.verify_ssl:
            connector_kwargs["ssl"] = False

        try:
            async with aiohttp.ClientSession(
                connector=aiohttp.TCPConnector(**connector_kwargs) if connector_kwargs else None,
                timeout=self.timeout,
            ) as session:
                async with session.post(url, json=payload, headers=headers, cookies=cookies) as response:
                    if response.status == 403 and allow_retry:
                        # Token expirado, reintentar
                        self.session_token = None
                        return await self._request(service, method, params, allow_retry=False)

                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(
                            "openwrt_rpc_error",
                            status=response.status,
                            service=service,
                            method=method,
                            body=error_text,
                        )
                        return False, None

                    data = await response.json()
                    if "error" in data and data["error"]:
                        logger.error(
                            "openwrt_rpc_response_error",
                            error=data["error"],
                            service=service,
                            method=method,
                        )
                        return False, data["error"]

                    return True, data.get("result")
        except asyncio.TimeoutError:
            logger.error("openwrt_rpc_timeout", service=service, method=method)
            return False, None
        except Exception as exc:
            logger.error("openwrt_rpc_exception", error=str(exc), service=service)
            return False, None

    async def _uci(self, action: str, params: List[Any]) -> Tuple[bool, Any]:
        """Wrapper para llamadas al servicio UCI."""
        return await self._request("uci", action, params)

    async def _sys_exec(self, command: str) -> Tuple[bool, Any]:
        """Ejecuta un comando en el router."""
        return await self._request("sys", "exec", [command])

    def _target_iface(self) -> str:
        """Obtiene el selector UCI para la interface a gestionar."""
        iface = self.device.network_interface or "@wifi-iface[0]"
        # Garantizar prefijo válido para secciones numéricas
        if iface.isdigit():
            return f"@wifi-iface[{iface}]"
        return iface

    # ------------------------------------------------------------------
    # Implementación de NetworkIntegrationBase
    # ------------------------------------------------------------------
    async def test_connection(self) -> Tuple[bool, str, Optional[int]]:
        """Prueba la conexión contra OpenWrt consultando el uptime."""
        start_time = datetime.utcnow()
        success, result = await self._request("sys", "uptime")
        elapsed_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)

        if success:
            uptime_seconds = 0
            if isinstance(result, list) and result:
                payload = result[-1]
                if isinstance(payload, dict):
                    uptime_seconds = payload.get("uptime", 0)
            await self.update_device_status()
            return True, f"Conectado a OpenWrt (uptime {uptime_seconds}s)", elapsed_ms

        await self.record_operation_failure("No se pudo conectar a OpenWrt")
        return False, "Error de conexión con OpenWrt", None

    async def block_mac(self, mac_address: str, reason: Optional[str] = None) -> Tuple[bool, str]:
        """Bloquea una MAC agregándola a la lista negra de WiFi."""
        mac = await self.normalize_mac_address(mac_address)
        iface = self._target_iface()

        try:
            # Configurar macfilter deny y agregar MAC
            success, _ = await self._uci("set", ["wireless", iface, "macfilter", "deny"])
            if not success:
                await self.record_operation_failure("No se pudo establecer macfilter")
                return False, f"No se pudo bloquear {mac}"

            await self._uci("add_list", ["wireless", iface, "maclist", mac])
            await self._uci("commit", ["wireless"])
            await self._sys_exec("/sbin/wifi reload")

            await self.record_operation_success()
            return True, f"MAC {mac} bloqueada en OpenWrt"
        except Exception as exc:
            await self.record_operation_failure(str(exc))
            return False, f"Error bloqueando {mac}: {exc}"

    async def unblock_mac(self, mac_address: str) -> Tuple[bool, str]:
        """Desbloquea una MAC eliminándola de la lista negra."""
        mac = await self.normalize_mac_address(mac_address)
        iface = self._target_iface()

        try:
            await self._uci("delete_list", ["wireless", iface, "maclist", mac])
            await self._uci("commit", ["wireless"])
            await self._sys_exec("/sbin/wifi reload")

            await self.record_operation_success()
            return True, f"MAC {mac} desbloqueada en OpenWrt"
        except Exception as exc:
            await self.record_operation_failure(str(exc))
            return False, f"Error desbloqueando {mac}: {exc}"

    async def get_blocked_macs(self) -> Tuple[bool, List[str]]:
        """Obtiene la lista de MACs bloqueadas del iface configurado."""
        iface = self._target_iface()
        success, result = await self._uci("get", ["wireless", iface, "maclist"])

        if not success or not result:
            return False, []

        blocked: List[str] = []
        # Result estructura: [0, "lista"] o similar
        payload = result[-1]
        if isinstance(payload, list):
            blocked = payload
        elif isinstance(payload, str):
            blocked = [payload]

        await self.record_operation_success()
        return True, blocked

    async def set_bandwidth_limit(self, mac_address: str, limit_mbps: float) -> Tuple[bool, str]:
        """No soportado nativamente aún."""
        await self.record_operation_failure("Límites de ancho de banda no implementados")
        return False, "OpenWrt integration aún no soporta límites de ancho de banda"

    async def remove_bandwidth_limit(self, mac_address: str) -> Tuple[bool, str]:
        """No soportado nativamente aún."""
        await self.record_operation_failure("Límites de ancho de banda no implementados")
        return False, "OpenWrt integration aún no soporta límites de ancho de banda"

    async def get_device_stats(self) -> Tuple[bool, Dict[str, Any]]:
        """Obtiene métricas básicas (uptime y número de MACs bloqueadas)."""
        success, uptime_data = await self._request("sys", "uptime")
        stats: Dict[str, Any] = {
            "total_devices": 0,
            "online_devices": 0,
            "blocked_devices": 0,
            "bandwidth_usage_mbps": 0,
            "uptime_hours": 0,
            "last_update": datetime.utcnow().isoformat(),
        }

        if success and uptime_data:
            payload = uptime_data[-1] if isinstance(uptime_data, list) else uptime_data
            if isinstance(payload, dict):
                stats["uptime_hours"] = round(payload.get("uptime", 0) / 3600, 2)

        blocked_success, blocked = await self.get_blocked_macs()
        if blocked_success:
            stats["blocked_devices"] = len(blocked)

        await self.record_operation_success()
        return True, stats

    async def get_connected_devices(self) -> Tuple[bool, List[Dict[str, Any]]]:
        """
        Obtiene clientes conectados leyendo `iwinfo <iface> assoclist`.
        La salida se parsea para identificar MACs y niveles de señal.
        """
        iface = self.device.network_interface or "wlan0"
        success, result = await self._sys_exec(f"/usr/bin/iwinfo {iface} assoclist")

        if not success or not result:
            return False, []

        output = ""
        if isinstance(result, list) and len(result) > 1:
            # Formato típico: [0, "line1\nline2"]
            output = result[1]
        elif isinstance(result, str):
            output = result

        devices: List[Dict[str, Any]] = []
        for line in output.splitlines():
            line = line.strip()
            if not line or "Signal" not in line:
                continue
            parts = line.split()
            mac = parts[0]
            signal = None
            for part in parts:
                if part.startswith("Signal"):
                    try:
                        signal = int(part.split(":")[1])
                    except Exception:
                        signal = None
            devices.append({
                "mac": mac,
                "ip": None,
                "hostname": None,
                "vendor": "Unknown",
                "signal_strength": signal,
                "bandwidth_usage_mbps": 0,
                "blocked": False,
                "is_online": True,
                "last_seen": None,
            })

        await self.record_operation_success()
        return True, devices
