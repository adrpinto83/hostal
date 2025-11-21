# app/services/network_integrations/ubiquiti.py
"""
Integración con Ubiquiti UniFi Controller.
Compatible con UniFi OS (v7+) y controladores UniFi clásicos.
"""
import aiohttp
import asyncio
import json
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
import logging

from sqlalchemy.orm import Session
from ...models import NetworkDevice

from .base import NetworkIntegrationBase

logger = logging.getLogger(__name__)


class UbiquitiIntegration(NetworkIntegrationBase):
    """
    Integración con Ubiquiti UniFi Controller.

    Requiere:
    - IP del controlador
    - API Key o credenciales (usuario/password)
    - Puerto (por defecto 8443 para UniFi OS, 8080 para classic)
    """

    def __init__(self, device: NetworkDevice, db: Session):
        super().__init__(device, db)
        self.base_url = f"{'https' if device.use_ssl else 'http'}://{device.ip_address}:{device.port}"
        self.api_key = device.api_key
        self.username = device.username
        self.password = device.password
        self.timeout = aiohttp.ClientTimeout(total=device.timeout_seconds)

    async def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict] = None,
        params: Optional[Dict] = None
    ) -> Tuple[bool, Any]:
        """
        Realiza una solicitud HTTP al controlador UniFi.

        Returns:
            Tupla (éxito: bool, respuesta: dict | None)
        """
        try:
            url = f"{self.base_url}/{endpoint}"

            connector_kwargs = {}
            if not self.device.verify_ssl:
                connector_kwargs['ssl'] = False

            async with aiohttp.ClientSession(
                connector=aiohttp.TCPConnector(**connector_kwargs) if connector_kwargs else None,
                timeout=self.timeout
            ) as session:
                headers = {"Content-Type": "application/json"}

                # Autenticación por API Key
                if self.api_key:
                    headers["Authorization"] = f"Bearer {self.api_key}"

                # Autenticación por credenciales
                if self.username and self.password:
                    async with session.post(
                        f"{self.base_url}/api/auth/login",
                        json={"username": self.username, "password": self.password},
                        headers=headers
                    ) as auth_response:
                        if auth_response.status != 200:
                            return False, None
                        auth_data = await auth_response.json()
                        headers["Authorization"] = f"Bearer {auth_data.get('access_token')}"

                # Realizar solicitud
                async with session.request(
                    method,
                    url,
                    json=data,
                    params=params,
                    headers=headers
                ) as response:
                    if response.status == 200:
                        return True, await response.json()
                    else:
                        error_text = await response.text()
                        logger.error(f"UniFi API error: {response.status} - {error_text}")
                        return False, None

        except asyncio.TimeoutError:
            logger.error(f"Timeout connecting to UniFi controller: {self.base_url}")
            return False, None
        except Exception as e:
            logger.error(f"Error making UniFi request: {str(e)}")
            return False, None

    async def test_connection(self) -> Tuple[bool, str, Optional[int]]:
        """Prueba la conexión con el controlador UniFi."""
        try:
            start_time = datetime.utcnow()
            success, response = await self._make_request("GET", "api/system")
            elapsed_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)

            if success and response:
                await self.update_device_status()
                return True, f"Conectado a UniFi Controller {response.get('version', 'unknown')}", elapsed_ms
            else:
                await self.record_operation_failure("No se pudo conectar al controlador UniFi")
                return False, "Error de conexión al controlador UniFi", None

        except Exception as e:
            await self.record_operation_failure(str(e))
            return False, f"Error: {str(e)}", None

    async def block_mac(self, mac_address: str, reason: Optional[str] = None) -> Tuple[bool, str]:
        """
        Bloquea una MAC address en UniFi.

        En UniFi, esto se hace marcando el cliente como bloqueado.
        """
        try:
            # Normalizar MAC
            mac = await self.normalize_mac_address(mac_address)

            # En UniFi, se obtiene primero el site_id (por defecto "default")
            site_id = "default"

            # Buscar el cliente
            success, clients = await self._make_request(
                "GET",
                f"api/v2/sites/{site_id}/clients",
                params={"filter": json.dumps({"mac": mac})}
            )

            if not success or not clients:
                await self.record_operation_failure(f"MAC {mac} no encontrada")
                return False, f"MAC {mac} no encontrada en UniFi"

            client_id = clients[0].get("_id")

            # Bloquear cliente
            success, _ = await self._make_request(
                "POST",
                f"api/v2/sites/{site_id}/clients/{client_id}/block",
                data={"blocked": True}
            )

            if success:
                await self.record_operation_success()
                return True, f"MAC {mac} bloqueada exitosamente"
            else:
                await self.record_operation_failure(f"No se pudo bloquear {mac}")
                return False, f"Error al bloquear {mac}"

        except Exception as e:
            await self.record_operation_failure(str(e))
            return False, f"Error: {str(e)}"

    async def unblock_mac(self, mac_address: str) -> Tuple[bool, str]:
        """Desbloquea una MAC address en UniFi."""
        try:
            mac = await self.normalize_mac_address(mac_address)
            site_id = "default"

            # Buscar cliente
            success, clients = await self._make_request(
                "GET",
                f"api/v2/sites/{site_id}/clients",
                params={"filter": json.dumps({"mac": mac})}
            )

            if not success or not clients:
                return False, f"MAC {mac} no encontrada"

            client_id = clients[0].get("_id")

            # Desbloquear
            success, _ = await self._make_request(
                "POST",
                f"api/v2/sites/{site_id}/clients/{client_id}/unblock",
                data={"blocked": False}
            )

            if success:
                await self.record_operation_success()
                return True, f"MAC {mac} desbloqueada exitosamente"
            else:
                await self.record_operation_failure(f"No se pudo desbloquear {mac}")
                return False, f"Error al desbloquear {mac}"

        except Exception as e:
            await self.record_operation_failure(str(e))
            return False, f"Error: {str(e)}"

    async def get_blocked_macs(self) -> Tuple[bool, List[str]]:
        """Obtiene lista de MACs bloqueadas."""
        try:
            site_id = "default"
            success, clients = await self._make_request(
                "GET",
                f"api/v2/sites/{site_id}/clients",
                params={"filter": json.dumps({"blocked": True})}
            )

            if success and clients:
                blocked_macs = [client.get("mac") for client in clients]
                await self.record_operation_success()
                return True, blocked_macs
            else:
                return False, []

        except Exception as e:
            await self.record_operation_failure(str(e))
            return False, []

    async def set_bandwidth_limit(
        self,
        mac_address: str,
        limit_mbps: float
    ) -> Tuple[bool, str]:
        """Establece límite de ancho de banda para una MAC en UniFi."""
        try:
            mac = await self.normalize_mac_address(mac_address)
            site_id = "default"

            # Convertir Mbps a bps para UniFi
            limit_bps = int(limit_mbps * 1_000_000)

            success, clients = await self._make_request(
                "GET",
                f"api/v2/sites/{site_id}/clients",
                params={"filter": json.dumps({"mac": mac})}
            )

            if not success or not clients:
                return False, f"MAC {mac} no encontrada"

            client_id = clients[0].get("_id")

            # Aplicar límite de ancho de banda
            success, _ = await self._make_request(
                "PUT",
                f"api/v2/sites/{site_id}/clients/{client_id}",
                data={"bandwidth_limit": limit_bps}
            )

            if success:
                await self.record_operation_success()
                return True, f"Límite de {limit_mbps} Mbps aplicado a {mac}"
            else:
                await self.record_operation_failure(f"No se pudo aplicar límite a {mac}")
                return False, f"Error al aplicar límite"

        except Exception as e:
            await self.record_operation_failure(str(e))
            return False, f"Error: {str(e)}"

    async def remove_bandwidth_limit(self, mac_address: str) -> Tuple[bool, str]:
        """Remueve límite de ancho de banda de una MAC."""
        try:
            mac = await self.normalize_mac_address(mac_address)
            site_id = "default"

            success, clients = await self._make_request(
                "GET",
                f"api/v2/sites/{site_id}/clients",
                params={"filter": json.dumps({"mac": mac})}
            )

            if not success or not clients:
                return False, f"MAC {mac} no encontrada"

            client_id = clients[0].get("_id")

            # Remover límite
            success, _ = await self._make_request(
                "PUT",
                f"api/v2/sites/{site_id}/clients/{client_id}",
                data={"bandwidth_limit": 0}
            )

            if success:
                await self.record_operation_success()
                return True, f"Límite de ancho de banda removido de {mac}"
            else:
                return False, f"Error al remover límite"

        except Exception as e:
            await self.record_operation_failure(str(e))
            return False, f"Error: {str(e)}"

    async def get_device_stats(self) -> Tuple[bool, Dict[str, Any]]:
        """Obtiene estadísticas del controlador UniFi."""
        try:
            site_id = "default"

            success, data = await self._make_request(
                "GET",
                f"api/v2/sites/{site_id}/stats"
            )

            if success and data:
                stats = {
                    "total_devices": data.get("num_client", 0),
                    "online_devices": data.get("num_client_online", 0),
                    "blocked_devices": data.get("num_client_blocked", 0),
                    "bandwidth_usage_mbps": data.get("bandwidth", 0) / 1_000_000,
                    "uptime_hours": data.get("uptime", 0) / 3600,
                    "last_update": datetime.utcnow().isoformat()
                }
                await self.record_operation_success()
                return True, stats
            else:
                return False, {}

        except Exception as e:
            await self.record_operation_failure(str(e))
            return False, {}

    async def get_connected_devices(self) -> Tuple[bool, List[Dict[str, Any]]]:
        """Obtiene lista de dispositivos conectados a UniFi."""
        try:
            site_id = "default"

            success, clients = await self._make_request(
                "GET",
                f"api/v2/sites/{site_id}/clients"
            )

            if success and clients:
                devices = []
                for client in clients:
                    device = {
                        "mac": client.get("mac"),
                        "ip": client.get("ip"),
                        "hostname": client.get("hostname"),
                        "vendor": client.get("vendor", "Unknown"),
                        "signal_strength": client.get("signal", None),
                        "bandwidth_usage_mbps": client.get("bandwidth", 0) / 1_000_000,
                        "blocked": client.get("blocked", False),
                        "is_online": client.get("is_online", False),
                        "last_seen": client.get("last_seen", None)
                    }
                    devices.append(device)

                await self.record_operation_success()
                return True, devices
            else:
                return False, []

        except Exception as e:
            await self.record_operation_failure(str(e))
            return False, []
