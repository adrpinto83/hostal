# app/models/maintenance.py
"""Modelo para registrar mantenimiento y limpieza de habitaciones."""
from __future__ import annotations

from datetime import datetime
from enum import Enum

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import relationship

from ..core.db import Base


class MaintenanceType(str, Enum):
    """Tipos de mantenimiento."""
    cleaning = "cleaning"  # Limpieza regular
    deep_cleaning = "deep_cleaning"  # Limpieza profunda
    plumbing = "plumbing"  # Plomería
    electrical = "electrical"  # Eléctrico
    carpentry = "carpentry"  # Carpintería
    painting = "painting"  # Pintura
    air_conditioning = "air_conditioning"  # Aire acondicionado
    furniture = "furniture"  # Muebles
    other = "other"  # Otro


class MaintenanceStatus(str, Enum):
    """Estado del mantenimiento."""
    pending = "pending"  # Pendiente
    in_progress = "in_progress"  # En progreso
    completed = "completed"  # Completado
    cancelled = "cancelled"  # Cancelado


class MaintenancePriority(str, Enum):
    """Prioridad del mantenimiento."""
    low = "low"  # Baja
    medium = "medium"  # Media
    high = "high"  # Alta
    urgent = "urgent"  # Urgente


class Maintenance(Base):
    """Registro de tareas de mantenimiento y limpieza."""
    __tablename__ = "maintenances"

    id = Column(Integer, primary_key=True, index=True)

    # Relaciones
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False, index=True)
    staff_id = Column(Integer, ForeignKey("staff.id"), nullable=True, index=True)  # Quién lo realiza

    # Información del mantenimiento
    type = Column(
        SAEnum(MaintenanceType, name="maintenance_type", create_constraint=True),
        nullable=False
    )
    status = Column(
        SAEnum(MaintenanceStatus, name="maintenance_status", create_constraint=True),
        nullable=False,
        default=MaintenanceStatus.pending,
        server_default="pending"
    )
    priority = Column(
        SAEnum(MaintenancePriority, name="maintenance_priority", create_constraint=True),
        nullable=False,
        default=MaintenancePriority.medium,
        server_default="medium"
    )

    # Fechas
    reported_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True, index=True)

    # Descripción y notas
    description = Column(Text, nullable=False)  # Descripción del problema/tarea
    notes = Column(Text, nullable=True)  # Notas adicionales o resultado
    reported_by = Column(String(255), nullable=True)  # Quién reportó (puede ser un huésped)

    # Relaciones
    room = relationship("Room", back_populates="maintenances")
    staff = relationship("Staff", back_populates="maintenances")

    @property
    def duration_hours(self) -> float | None:
        """Calcula la duración del mantenimiento en horas."""
        if self.started_at and self.completed_at:
            delta = self.completed_at - self.started_at
            return delta.total_seconds() / 3600
        return None

    @property
    def is_overdue(self) -> bool:
        """Verifica si el mantenimiento está atrasado (más de 24 horas sin completar)."""
        if self.status in (MaintenanceStatus.completed, MaintenanceStatus.cancelled):
            return False
        hours_elapsed = (datetime.utcnow() - self.reported_at).total_seconds() / 3600
        return hours_elapsed > 24
