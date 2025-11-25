# app/models/network_device.py
"""
Modelo para dispositivos de red (switches, routers, APs) integrados con el sistema.
Soporta múltiples marcas: Ubiquiti, Mikrotik, Cisco, TP-Link, Asus, etc.
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import Boolean, DateTime, Integer, String, Text, Float
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.db import Base


class DeviceBrand(str, Enum):
    """Marcas de dispositivos de red soportadas."""
    UBIQUITI = "ubiquiti"  # UniFi Controller
    MIKROTIK = "mikrotik"  # RouterOS / API REST
    OPENWRT = "openwrt"  # LuCI / RPC
    CISCO = "cisco"  # IOS-XE / NETCONF
    TP_LINK = "tp_link"  # Omada Controller
    ASUS = "asus"  # ASUS Router
    DLINK = "dlink"  # D-Link
    NETGEAR = "netgear"  # Netgear
    ARUBA = "aruba"  # Aruba Networks
    FORTINET = "fortinet"  # FortiGate
    OTHER = "other"  # Genérico


class DeviceType(str, Enum):
    """Tipos de dispositivos de red."""
    SWITCH = "switch"  # Switch/Conmutador
    ROUTER = "router"  # Router
    ACCESS_POINT = "access_point"  # Punto de acceso inalámbrico
    FIREWALL = "firewall"  # Firewall
    CONTROLLER = "controller"  # Controlador (UniFi, Omada, etc.)
    MODEM = "modem"  # Módem


class ConnectionStatus(str, Enum):
    """Estado de conexión con el dispositivo."""
    CONNECTED = "connected"  # Conectado y disponible
    DISCONNECTED = "disconnected"  # No disponible
    ERROR = "error"  # Error de conexión
    TESTING = "testing"  # Probando conexión


class AuthType(str, Enum):
    """Tipos de autenticación soportados."""
    USERNAME_PASSWORD = "username_password"  # Usuario y contraseña
    API_KEY = "api_key"  # Clave API
    TOKEN = "token"  # Token JWT
    CERTIFICATE = "certificate"  # Certificado SSL/TLS
    SSH_KEY = "ssh_key"  # Clave SSH


class NetworkDevice(Base):
    """Dispositivo de red integrado para control de internet."""
    __tablename__ = "network_devices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # Información básica del dispositivo
    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    brand: Mapped[DeviceBrand] = mapped_column(
        SAEnum(DeviceBrand, name="device_brand", create_constraint=True),
        nullable=False,
        index=True
    )
    device_type: Mapped[DeviceType] = mapped_column(
        SAEnum(DeviceType, name="device_type", create_constraint=True),
        nullable=False,
        index=True
    )

    # Ubicación y red
    ip_address: Mapped[str] = mapped_column(String(45), nullable=False, unique=True, index=True)
    mac_address: Mapped[str] = mapped_column(String(17), nullable=True)  # MAC del dispositivo mismo
    network_interface: Mapped[str | None] = mapped_column(String(50), nullable=True)  # eth0, ens1, etc.

    # Autenticación
    auth_type: Mapped[AuthType] = mapped_column(
        SAEnum(AuthType, name="auth_type", create_constraint=True),
        nullable=False
    )
    username: Mapped[str | None] = mapped_column(String(100), nullable=True)
    password: Mapped[str | None] = mapped_column(String(255), nullable=True)  # Encriptada en prod
    api_key: Mapped[str | None] = mapped_column(String(500), nullable=True)  # Token/clave API
    api_secret: Mapped[str | None] = mapped_column(String(500), nullable=True)  # Secret adicional
    certificate_path: Mapped[str | None] = mapped_column(String(500), nullable=True)  # Ruta del certificado

    # Configuración de conexión
    port: Mapped[int] = mapped_column(Integer, default=22, nullable=False)  # Puerto (SSH, HTTP, etc)
    use_ssl: Mapped[bool] = mapped_column(Boolean, default=True)
    verify_ssl: Mapped[bool] = mapped_column(Boolean, default=True)
    timeout_seconds: Mapped[int] = mapped_column(Integer, default=30)

    # Estado del dispositivo
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    connection_status: Mapped[ConnectionStatus] = mapped_column(
        SAEnum(ConnectionStatus, name="connection_status", create_constraint=True),
        default=ConnectionStatus.DISCONNECTED,
        index=True
    )
    last_connection_attempt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_successful_connection: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Estadísticas de sincronización
    total_operations: Mapped[int] = mapped_column(Integer, default=0)
    failed_operations: Mapped[int] = mapped_column(Integer, default=0)
    success_rate: Mapped[float] = mapped_column(Float, default=100.0)  # Porcentaje

    # Capacidades del dispositivo
    supports_mac_blocking: Mapped[bool] = mapped_column(Boolean, default=True)
    supports_bandwidth_control: Mapped[bool] = mapped_column(Boolean, default=False)
    supports_vlan: Mapped[bool] = mapped_column(Boolean, default=False)
    supports_firewall_rules: Mapped[bool] = mapped_column(Boolean, default=False)
    supports_traffic_shaping: Mapped[bool] = mapped_column(Boolean, default=False)

    # Configuración específica por marca (JSON en prod, aquí como texto)
    vendor_config: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON con config específica

    # Auditoría
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by: Mapped[int | None] = mapped_column(Integer, nullable=True)  # User ID

    @property
    def is_connected(self) -> bool:
        """Verifica si el dispositivo está conectado."""
        return self.connection_status == ConnectionStatus.CONNECTED

    @property
    def health_percentage(self) -> float:
        """Porcentaje de salud del dispositivo basado en tasa de éxito."""
        if self.total_operations == 0:
            return 100.0
        return self.success_rate

    def __repr__(self) -> str:
        return f"<NetworkDevice({self.name}, {self.brand.value}, {self.connection_status.value})>"
