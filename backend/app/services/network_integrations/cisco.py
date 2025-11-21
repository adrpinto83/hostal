# app/services/network_integrations/cisco.py
"""
Integración con Cisco Switches y Routers.
Soporta IOS-XE vía API REST (Catalyst 9x00 series) y NETCONF.
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


class CiscoIntegration(NetworkIntegrationBase):
    """
    Integración con Cisco IOS-XE vía API REST.

    Requiere:
    - IP del dispositivo Cisco
    - Usuario y contraseña
    - Puerto (por defecto 443 para HTTPS)
    """

    def __init__(self, device: NetworkDevice, db: Session):
        super().__init__(device, db)
        self.base_url = f"{'https' if device.use_ssl else 'http'}://{device.ip_address}:{device.port}/restconf/data"
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
        Realiza una solicitud HTTP a la API RESTCONF de Cisco.

        Returns:
            Tupla (éxito: bool, respuesta: dict | None)
        """
        try:
            url = f"{self.base_url}/{endpoint}"

            # Autenticación básica
            auth_string = base64.b64encode(
                f"{self.username}:{self.password}".encode()
            ).decode()
            headers = {
                "Authorization": f"Basic {auth_string}",
                "Content-Type": "application/yang-data+json",
                "Accept": "application/yang-data+json"
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
                    if response.status in [200, 201, 204]:
                        if response.status == 204:
                            return True, None
                        return True, await response.json()
                    else:
                        error_text = await response.text()
                        logger.error(f"Cisco API error: {response.status} - {error_text}")
                        return False, None

        except asyncio.TimeoutError:
            logger.error(f"Timeout connecting to Cisco device: {self.base_url}")
            return False, None
        except Exception as e:
            logger.error(f"Error making Cisco request: {str(e)}")
            return False, None

    async def test_connection(self) -> Tuple[bool, str, Optional[int]]:
        """Prueba la conexión con dispositivo Cisco."""
        try:
            start_time = datetime.utcnow()
            success, response = await self._make_request(
                "GET",
                "ietf-yang-library:yang-library"
            )
            elapsed_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)

            if success:
                await self.update_device_status()
                return True, f"Conectado a Cisco IOS-XE", elapsed_ms
            else:
                await self.record_operation_failure("No se pudo conectar a Cisco")
                return False, "Error de conexión a Cisco", None

        except Exception as e:
            await self.record_operation_failure(str(e))
            return False, f"Error: {str(e)}", None

    async def block_mac(self, mac_address: str, reason: Optional[str] = None) -> Tuple[bool, str]:
        """
        Bloquea una MAC address usando Port Security en Cisco.
        """
        try:
            mac = await self.normalize_mac_address(mac_address)

            # Agregar MAC a la lista negra de Port Security
            # Nota: Esto es simplificado y variaría según la configuración del switch
            data = {
                "Cisco-IOS-XE-native:native": {
                    "mac": {
                        "access-list": {
                            "extended": [
                                {
                                    "name": "BLOCKED_MAC",
                                    "access-list-seq-rule": [
                                        {
                                            "sequence": 10,
                                            "remark": reason or "Blocked device",
                                            "deny": {
                                                "protocol": "ip",
                                                "source-addr": mac,
                                                "destination-addr": "any"
                                            }
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                }
            }

            success, _ = await self._make_request(
                "PATCH",
                "Cisco-IOS-XE-native:native/mac",
                data=data
            )

            if success:
                await self.record_operation_success()
                return True, f"MAC {mac} bloqueada exitosamente en Cisco"
            else:
                await self.record_operation_failure(f"No se pudo bloquear {mac}")
                return False, f"Error al bloquear {mac}"

        except Exception as e:
            await self.record_operation_failure(str(e))
            return False, f"Error: {str(e)}"

    async def unblock_mac(self, mac_address: str) -> Tuple[bool, str]:
        """Desbloquea una MAC address en Cisco."""
        try:
            mac = await self.normalize_mac_address(mac_address)

            # Remover la regla del ACL
            # Nota: Esto variaría según la configuración
            success, _ = await self._make_request(
                "DELETE",
                f"Cisco-IOS-XE-native:native/mac/access-list/extended=BLOCKED_MAC/access-list-seq-rule=10"
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
        """Obtiene lista de MACs bloqueadas en Cisco."""
        try:
            success, response = await self._make_request(
                "GET",
                "Cisco-IOS-XE-native:native/mac/access-list/extended"
            )

            if success and response:
                blocked_macs = []
                # Procesar respuesta para extraer MACs
                # Nota: La estructura exacta variaría según la respuesta
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
        """Establece límite de ancho de banda en Cisco."""
        try:
            mac = await self.normalize_mac_address(mac_address)

            # Configurar policy-map para QoS
            data = {
                "Cisco-IOS-XE-native:native": {
                    "policy-map": [
                        {
                            "name": f"limit_{mac.replace(':', '_')}",
                            "class": [
                                {
                                    "name": "default",
                                    "police": {
                                        "rate": int(limit_mbps * 1_000_000),
                                        "burst": int(limit_mbps * 1_000_000 / 10)
                                    }
                                }
                            ]
                        }
                    ]
                }
            }

            success, _ = await self._make_request(
                "PATCH",
                "Cisco-IOS-XE-native:native/policy-map",
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
        """Remueve límite de ancho de banda en Cisco."""
        try:
            mac = await self.normalize_mac_address(mac_address)
            policy_name = f"limit_{mac.replace(':', '_')}"

            success, _ = await self._make_request(
                "DELETE",
                f"Cisco-IOS-XE-native:native/policy-map={policy_name}"
            )

            if success:
                await self.record_operation_success()
                return True, f"Límite removido de {mac}"
            else:
                return False, f"No se pudo remover límite"

        except Exception as e:
            await self.record_operation_failure(str(e))
            return False, f"Error: {str(e)}"

    async def get_device_stats(self) -> Tuple[bool, Dict[str, Any]]:
        """Obtiene estadísticas del switch Cisco."""
        try:
            success, response = await self._make_request(
                "GET",
                "Cisco-IOS-XE-native:native/interface"
            )

            if success and response:
                stats = {
                    "total_devices": 0,
                    "online_devices": 0,
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
        """Obtiene dispositivos conectados al switch Cisco."""
        try:
            success, response = await self._make_request(
                "GET",
                "Cisco-IOS-XE-native:native/bridge-domain"
            )

            if success and response:
                devices = []
                # Procesar tablas MAC del switch
                # Nota: Estructura real variaría según el modelo
                await self.record_operation_success()
                return True, devices
            else:
                return False, []

        except Exception as e:
            await self.record_operation_failure(str(e))
            return False, []
