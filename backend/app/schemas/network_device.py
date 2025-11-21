# app/schemas/network_device.py
"""
Esquemas Pydantic para dispositivos de red.
"""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator

from ..models.network_device import DeviceBrand, DeviceType, ConnectionStatus, AuthType


class NetworkDeviceBase(BaseModel):
    """Base para dispositivos de red."""
    name: str = Field(..., min_length=1, max_length=100, description="Nombre del dispositivo", examples=["Router Principal"])
    description: Optional[str] = Field(None, description="Descripción", examples=["Router principal de la entrada"])
    brand: DeviceBrand = Field(..., description="Marca del dispositivo")
    device_type: DeviceType = Field(..., description="Tipo de dispositivo")
    ip_address: str = Field(..., description="Dirección IP del dispositivo", examples=["192.168.1.1"])
    mac_address: Optional[str] = Field(None, description="Dirección MAC del dispositivo", examples=["AA:BB:CC:DD:EE:FF"])
    network_interface: Optional[str] = Field(None, description="Interfaz de red", examples=["eth0"])


class NetworkDeviceAuth(BaseModel):
    """Autenticación del dispositivo."""
    auth_type: AuthType = Field(..., description="Tipo de autenticación")
    username: Optional[str] = Field(None, description="Nombre de usuario", examples=["admin"])
    password: Optional[str] = Field(None, description="Contraseña", examples=["secure_password"])
    api_key: Optional[str] = Field(None, description="Clave API", examples=["sk_live_xxxxxxxxxxxxx"])
    api_secret: Optional[str] = Field(None, description="Secret de API", examples=["secret_xxxxx"])
    certificate_path: Optional[str] = Field(None, description="Ruta del certificado SSL", examples=["/etc/ssl/certs/device.crt"])


class NetworkDeviceConfig(BaseModel):
    """Configuración de conexión."""
    port: int = Field(default=22, ge=1, le=65535, description="Puerto de conexión")
    use_ssl: bool = Field(default=True, description="Usar SSL/TLS")
    verify_ssl: bool = Field(default=True, description="Verificar certificado SSL")
    timeout_seconds: int = Field(default=30, ge=1, le=300, description="Timeout en segundos")


class NetworkDeviceCapabilities(BaseModel):
    """Capacidades del dispositivo."""
    supports_mac_blocking: bool = Field(default=True, description="Soporta bloqueo por MAC")
    supports_bandwidth_control: bool = Field(default=False, description="Soporta control de ancho de banda")
    supports_vlan: bool = Field(default=False, description="Soporta VLAN")
    supports_firewall_rules: bool = Field(default=False, description="Soporta reglas de firewall")
    supports_traffic_shaping: bool = Field(default=False, description="Soporta traffic shaping")


class NetworkDeviceCreate(NetworkDeviceBase, NetworkDeviceAuth, NetworkDeviceConfig, NetworkDeviceCapabilities):
    """Crear nuevo dispositivo de red."""
    vendor_config: Optional[str] = Field(None, description="Configuración específica del fabricante en JSON")

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "name": "UniFi Router Principal",
                    "brand": "ubiquiti",
                    "device_type": "router",
                    "ip_address": "192.168.1.1",
                    "mac_address": "AA:BB:CC:DD:EE:FF",
                    "auth_type": "api_key",
                    "api_key": "sk_live_xxxxxxxxxxxxx",
                    "port": 8443,
                    "use_ssl": True,
                    "verify_ssl": True,
                    "supports_mac_blocking": True,
                }
            ]
        }
    )


class NetworkDeviceUpdate(BaseModel):
    """Actualizar dispositivo de red."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    network_interface: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    certificate_path: Optional[str] = None
    port: Optional[int] = Field(None, ge=1, le=65535)
    use_ssl: Optional[bool] = None
    verify_ssl: Optional[bool] = None
    timeout_seconds: Optional[int] = Field(None, ge=1, le=300)
    supports_mac_blocking: Optional[bool] = None
    supports_bandwidth_control: Optional[bool] = None
    supports_vlan: Optional[bool] = None
    supports_firewall_rules: Optional[bool] = None
    supports_traffic_shaping: Optional[bool] = None
    is_active: Optional[bool] = None
    vendor_config: Optional[str] = None


class NetworkDeviceOut(NetworkDeviceBase, NetworkDeviceConfig, NetworkDeviceCapabilities):
    """Salida de dispositivo de red."""
    id: int
    is_active: bool
    connection_status: ConnectionStatus
    last_connection_attempt: Optional[datetime] = None
    last_successful_connection: Optional[datetime] = None
    last_error_message: Optional[str] = None
    total_operations: int
    failed_operations: int
    success_rate: float
    health_percentage: float
    is_connected: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NetworkDeviceTestConnection(BaseModel):
    """Resultado de prueba de conexión."""
    device_id: int
    is_connected: bool
    status: ConnectionStatus
    message: str
    timestamp: datetime
    response_time_ms: Optional[int] = None


class NetworkDeviceListOut(BaseModel):
    """Lista simplificada de dispositivos de red."""
    id: int
    name: str
    brand: DeviceBrand
    device_type: DeviceType
    ip_address: str
    is_active: bool
    connection_status: ConnectionStatus
    is_connected: bool
    health_percentage: float
    success_rate: float

    model_config = ConfigDict(from_attributes=True)
