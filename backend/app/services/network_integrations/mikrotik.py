# app/services/network_integrations/mikrotik.py
"""
Integración con Mikrotik RouterOS.
Soporta API REST de RouterOS v6.45+.
"""
import aiohttp
import asyncio
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
import logging
import base64

from sqlalchemy.orm import Session
from ...models import NetworkDevice

from .base import NetworkIntegrationBase

logger = logging.getLogger(__name__)


class MikrotikIntegration(NetworkIntegrationBase):
    """
    Integración con Mikrotik RouterOS API REST.

    Requiere:
    - IP del router
    - Usuario y contraseña
    - Puerto (por defecto 8728 para HTTP, 8729 para HTTPS)
    """

    def __init__(self, device: NetworkDevice, db: Session):
        super().__init__(device, db)
        self.base_url = f"{'https' if device.use_ssl else 'http'}://{device.ip_address}:{device.port}/rest"
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
        Realiza una solicitud HTTP a la API REST de Mikrotik.

        Returns:
            Tupla (éxito: bool, respuesta: dict | list | None)
        """
        try:
            url = f"{self.base_url}/{endpoint}"

            # Autenticación básica
            auth_string = base64.b64encode(
                f"{self.username}:{self.password}".encode()
            ).decode()
            headers = {
                "Authorization": f"Basic {auth_string}",
                "Content-Type": "application/json"
            }

            connector_kwargs = {}
            if not self.device.verify_ssl:
                connector_kwargs['ssl'] = False

            async with aiohttp.ClientSession(
                connector=aiohttp.TCPConnector(**connector_kwargs) if connector_kwargs else None,
                timeout=self.timeout
            ) as session:
                async with session.request(
                    method,
                    url,
                    json=data,
                    params=params,
                    headers=headers
                ) as response:
                    if response.status == 200:
                        content_type = response.headers.get('Content-Type', '')
                        if 'application/json' in content_type:
                            return True, await response.json()
                        else:
                            return True, await response.text()
                    else:
                        error_text = await response.text()
                        logger.error(f"Mikrotik API error: {response.status} - {error_text}")
                        return False, None

        except asyncio.TimeoutError:
            logger.error(f"Timeout connecting to Mikrotik: {self.base_url}")
            return False, None
        except Exception as e:
            logger.error(f"Error making Mikrotik request: {str(e)}")
            return False, None

    async def test_connection(self) -> Tuple[bool, str, Optional[int]]:
        """Prueba la conexión con Mikrotik."""
        try:
            start_time = datetime.utcnow()
            success, response = await self._make_request("GET", "system/identity")
            elapsed_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)

            if success and response:
                identity = response[0].get("name", "Unknown") if isinstance(response, list) else response.get("name", "Unknown")
                await self.update_device_status()
                return True, f"Conectado a Mikrotik {identity}", elapsed_ms
            else:
                await self.record_operation_failure("No se pudo conectar a Mikrotik")
                return False, "Error de conexión a Mikrotik", None

        except Exception as e:
            await self.record_operation_failure(str(e))
            return False, f"Error: {str(e)}", None

    async def block_mac(self, mac_address: str, reason: Optional[str] = None) -> Tuple[bool, str]:
        """
        Bloquea una MAC address en Mikrotik usando listas negras.
        """
        try:
            mac = await self.normalize_mac_address(mac_address)

            # En Mikrotik, agregamos a la lista negra IP/MAC
            # Primero intentamos bloquear directamente en firewall
            data = {
                "chain": "forward",
                "action": "drop",
                "src-mac-address": mac,
                "comment": f"Blocked: {reason or 'User blocked'}"
            }

            success, response = await self._make_request(
                "POST",
                "ip/firewall/filter",
                data=data
            )

            if success:
                await self.record_operation_success()
                return True, f"MAC {mac} bloqueada exitosamente en Mikrotik"
            else:
                await self.record_operation_failure(f"No se pudo bloquear {mac}")
                return False, f"Error al bloquear {mac}"

        except Exception as e:
            await self.record_operation_failure(str(e))
            return False, f"Error: {str(e)}"

    async def unblock_mac(self, mac_address: str) -> Tuple[bool, str]:
        """Desbloquea una MAC address en Mikrotik."""
        try:
            mac = await self.normalize_mac_address(mac_address)

            # Buscar y eliminar regla de firewall
            success, rules = await self._make_request(
                "GET",
                "ip/firewall/filter",
                params={"src-mac-address": mac}
            )

            if success and rules:
                for rule in rules if isinstance(rules, list) else [rules]:
                    rule_id = rule.get(".id")
                    if rule_id:
                        delete_success, _ = await self._make_request(
                            "DELETE",
                            f"ip/firewall/filter/{rule_id}"
                        )
                        if delete_success:
                            await self.record_operation_success()
                            return True, f"MAC {mac} desbloqueada exitosamente"

                return False, f"No se pudo desbloquear {mac}"
            else:
                return False, f"Regla no encontrada para {mac}"

        except Exception as e:
            await self.record_operation_failure(str(e))
            return False, f"Error: {str(e)}"

    async def get_blocked_macs(self) -> Tuple[bool, List[str]]:
        """Obtiene lista de MACs bloqueadas en Mikrotik."""
        try:
            success, rules = await self._make_request(
                "GET",
                "ip/firewall/filter",
                params={"action": "drop"}
            )

            if success and rules:
                blocked_macs = []
                for rule in rules if isinstance(rules, list) else [rules]:
                    mac = rule.get("src-mac-address")
                    if mac:
                        blocked_macs.append(mac)

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
        """Establece límite de ancho de banda en Mikrotik."""
        try:
            mac = await self.normalize_mac_address(mac_address)

            # Convertir Mbps a kbps para Mikrotik
            limit_kbps = int(limit_mbps * 1000)

            data = {
                "src-mac-address": mac,
                "max-packet-size": 65535,
                "target-addresses": "0.0.0.0/0",
                "burst-limit": limit_kbps,
                "burst-time": "1s",
                "limit-at": limit_kbps
            }

            success, response = await self._make_request(
                "POST",
                "queue/simple",
                data=data
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
        """Remueve límite de ancho de banda en Mikrotik."""
        try:
            mac = await self.normalize_mac_address(mac_address)

            # Buscar y eliminar la regla de queue
            success, queues = await self._make_request(
                "GET",
                "queue/simple",
                params={"src-mac-address": mac}
            )

            if success and queues:
                for queue in queues if isinstance(queues, list) else [queues]:
                    queue_id = queue.get(".id")
                    if queue_id:
                        delete_success, _ = await self._make_request(
                            "DELETE",
                            f"queue/simple/{queue_id}"
                        )
                        if delete_success:
                            await self.record_operation_success()
                            return True, f"Límite removido de {mac}"

                return False, f"No se pudo remover límite"
            else:
                return False, f"Queue no encontrada para {mac}"

        except Exception as e:
            await self.record_operation_failure(str(e))
            return False, f"Error: {str(e)}"

    async def get_device_stats(self) -> Tuple[bool, Dict[str, Any]]:
        """Obtiene estadísticas de Mikrotik."""
        try:
            # Obtener interfaz stats
            success, interfaces = await self._make_request(
                "GET",
                "interface"
            )

            if success and interfaces:
                total_bandwidth = 0
                online_interfaces = 0

                for iface in interfaces if isinstance(interfaces, list) else [interfaces]:
                    if iface.get("running"):
                        online_interfaces += 1

                stats = {
                    "total_devices": 0,  # Mikrotik no proporciona esto fácilmente
                    "online_devices": online_interfaces,
                    "blocked_devices": 0,
                    "bandwidth_usage_mbps": 0,
                    "uptime_hours": 0,
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
        """Obtiene dispositivos conectados a Mikrotik."""
        try:
            # Obtener clientes DHCP
            success, leases = await self._make_request(
                "GET",
                "ip/dhcp-server/lease"
            )

            if success and leases:
                devices = []
                for lease in leases if isinstance(leases, list) else [leases]:
                    device = {
                        "mac": lease.get("mac-address"),
                        "ip": lease.get("address"),
                        "hostname": lease.get("comment", "Unknown"),
                        "vendor": "Unknown",
                        "signal_strength": None,
                        "bandwidth_usage_mbps": 0,
                        "blocked": False,
                        "is_online": lease.get("status") == "bound",
                        "last_seen": None
                    }
                    devices.append(device)

                await self.record_operation_success()
                return True, devices
            else:
                return False, []

        except Exception as e:
            await self.record_operation_failure(str(e))
            return False, []
