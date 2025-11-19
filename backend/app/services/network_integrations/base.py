# app/services/network_integrations/base.py
"""
Clase base abstracta para integraciones con dispositivos de red.
Define la interfaz que todas las integraciones deben implementar.
"""
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
from sqlalchemy.orm import Session

from ...models import NetworkDevice
from ...schemas.network_device import NetworkDeviceTestConnection
from ...models.network_device import ConnectionStatus


class NetworkIntegrationBase(ABC):
    """
    Clase base abstracta para todas las integraciones de dispositivos de red.

    Cada marca (Ubiquiti, Mikrotik, Cisco, etc.) debe implementar esta interfaz.
    """

    def __init__(self, device: NetworkDevice, db: Session):
        """
        Inicializa la integración.

        Args:
            device: Objeto NetworkDevice con configuración
            db: Sesión de base de datos
        """
        self.device = device
        self.db = db

    @abstractmethod
    async def test_connection(self) -> Tuple[bool, str, Optional[int]]:
        """
        Prueba la conexión con el dispositivo.

        Returns:
            Tupla (éxito: bool, mensaje: str, tiempo_respuesta_ms: int | None)
        """
        pass

    @abstractmethod
    async def block_mac(self, mac_address: str, reason: Optional[str] = None) -> Tuple[bool, str]:
        """
        Bloquea una dirección MAC en el dispositivo.

        Args:
            mac_address: MAC address a bloquear (AA:BB:CC:DD:EE:FF)
            reason: Razón del bloqueo (opcional)

        Returns:
            Tupla (éxito: bool, mensaje: str)
        """
        pass

    @abstractmethod
    async def unblock_mac(self, mac_address: str) -> Tuple[bool, str]:
        """
        Desbloquea una dirección MAC en el dispositivo.

        Args:
            mac_address: MAC address a desbloquear

        Returns:
            Tupla (éxito: bool, mensaje: str)
        """
        pass

    @abstractmethod
    async def get_blocked_macs(self) -> Tuple[bool, List[str]]:
        """
        Obtiene la lista de MACs bloqueadas.

        Returns:
            Tupla (éxito: bool, macs: List[str])
        """
        pass

    @abstractmethod
    async def set_bandwidth_limit(
        self,
        mac_address: str,
        limit_mbps: float
    ) -> Tuple[bool, str]:
        """
        Establece un límite de ancho de banda para una MAC.

        Args:
            mac_address: MAC address
            limit_mbps: Límite en Mbps

        Returns:
            Tupla (éxito: bool, mensaje: str)
        """
        pass

    @abstractmethod
    async def remove_bandwidth_limit(self, mac_address: str) -> Tuple[bool, str]:
        """
        Remueve el límite de ancho de banda de una MAC.

        Args:
            mac_address: MAC address

        Returns:
            Tupla (éxito: bool, mensaje: str)
        """
        pass

    @abstractmethod
    async def get_device_stats(self) -> Tuple[bool, Dict[str, Any]]:
        """
        Obtiene estadísticas del dispositivo.

        Returns:
            Tupla (éxito: bool, estadísticas: dict)

        Ejemplo de respuesta:
        {
            "total_devices": 50,
            "online_devices": 45,
            "blocked_devices": 5,
            "bandwidth_usage_mbps": 125.5,
            "uptime_hours": 336
        }
        """
        pass

    @abstractmethod
    async def get_connected_devices(self) -> Tuple[bool, List[Dict[str, Any]]]:
        """
        Obtiene lista de dispositivos conectados.

        Returns:
            Tupla (éxito: bool, dispositivos: List[dict])

        Ejemplo de respuesta:
        [
            {
                "mac": "AA:BB:CC:DD:EE:FF",
                "ip": "192.168.1.100",
                "hostname": "iPhone-Juan",
                "vendor": "Apple",
                "signal_strength": -45,  # dBm
                "bandwidth_usage_mbps": 5.2,
                "blocked": False
            }
        ]
        """
        pass

    async def update_device_status(self):
        """
        Actualiza el estado del dispositivo en la BD después de una operación.
        """
        now = datetime.utcnow()
        self.device.last_connection_attempt = now
        self.device.last_successful_connection = now
        self.device.connection_status = ConnectionStatus.CONNECTED
        self.device.last_error_message = None
        self.db.commit()

    async def record_operation_failure(self, error_message: str):
        """
        Registra una operación fallida.
        """
        self.device.failed_operations += 1
        self.device.total_operations += 1
        self.device.last_error_message = error_message
        self.device.connection_status = ConnectionStatus.ERROR
        self.device.last_connection_attempt = datetime.utcnow()

        if self.device.total_operations > 0:
            self.device.success_rate = (
                (self.device.total_operations - self.device.failed_operations)
                / self.device.total_operations * 100
            )

        self.db.commit()

    async def record_operation_success(self):
        """
        Registra una operación exitosa.
        """
        self.device.total_operations += 1

        if self.device.total_operations > 0:
            self.device.success_rate = (
                (self.device.total_operations - self.device.failed_operations)
                / self.device.total_operations * 100
            )

        self.device.connection_status = ConnectionStatus.CONNECTED
        self.device.last_successful_connection = datetime.utcnow()
        self.db.commit()

    async def validate_mac_address(self, mac_address: str) -> bool:
        """
        Valida formato de dirección MAC.

        Args:
            mac_address: MAC a validar

        Returns:
            True si es válida
        """
        import re
        pattern = r'^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$'
        return bool(re.match(pattern, mac_address))

    async def normalize_mac_address(self, mac_address: str) -> str:
        """
        Normaliza MAC address al formato AA:BB:CC:DD:EE:FF
        """
        # Remover guiones y convertir a mayúsculas
        mac = mac_address.replace('-', '').replace(':', '').upper()

        # Reformatear con dos puntos
        return ':'.join(mac[i:i+2] for i in range(0, len(mac), 2))
