# app/models/network_activity.py
"""
Modelo para registrar actividad de red de dispositivos de huéspedes.
Útil para reportes de consumo, auditoría y control de internet.
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum

from sqlalchemy import BigInteger, Boolean, Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import relationship

from ..core.db import Base


class ActivityType(str, Enum):
    """Tipos de actividad de red."""
    connected = "connected"  # Dispositivo conectado
    disconnected = "disconnected"  # Dispositivo desconectado
    blocked = "blocked"  # Dispositivo bloqueado (suspensión de internet)
    unblocked = "unblocked"  # Dispositivo desbloqueado
    quota_exceeded = "quota_exceeded"  # Cuota de datos excedida


class NetworkActivity(Base):
    """Registro de actividad de red de dispositivos."""
    __tablename__ = "network_activities"

    id = Column(Integer, primary_key=True, index=True)

    # Relaciones
    device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"), nullable=False, index=True)
    guest_id = Column(Integer, ForeignKey("guests.id"), nullable=False, index=True)

    # Información de la actividad
    activity_type = Column(
        SAEnum(ActivityType, name="activity_type", create_constraint=True),
        nullable=False,
        index=True
    )
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)

    # Datos de conexión (opcionales, depende del router)
    ip_address = Column(String(45), nullable=True)  # IPv4 o IPv6
    bytes_downloaded = Column(BigInteger, nullable=True, default=0)  # Bytes descargados
    bytes_uploaded = Column(BigInteger, nullable=True, default=0)  # Bytes subidos
    session_duration_seconds = Column(Integer, nullable=True)  # Duración de la sesión

    # Metadatos
    initiated_by_system = Column(Boolean, default=True)  # True si fue automático, False si fue manual
    notes = Column(String(500), nullable=True)

    # Relaciones
    device = relationship("Device")
    guest = relationship("Guest")

    @property
    def total_bytes(self) -> int:
        """Total de bytes transferidos (upload + download)."""
        return (self.bytes_downloaded or 0) + (self.bytes_uploaded or 0)

    @property
    def total_mb(self) -> float:
        """Total de MB transferidos."""
        return self.total_bytes / (1024 * 1024)

    @property
    def total_gb(self) -> float:
        """Total de GB transferidos."""
        return self.total_bytes / (1024 * 1024 * 1024)
