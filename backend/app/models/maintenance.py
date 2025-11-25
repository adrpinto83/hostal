# app/models/maintenance.py
"""Modelo para registrar mantenimiento y limpieza de habitaciones."""
from __future__ import annotations

from datetime import datetime
from enum import Enum

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import relationship

from ..core.db import Base


class MaintenanceType(str, Enum):
    """Tipos de mantenimiento."""
    plomeria = "plomeria"  # Plomería
    electricidad = "electricidad"  # Eléctrico
    pintura = "pintura"  # Pintura
    limpieza_profunda = "limpieza_profunda"  # Limpieza profunda
    reparacion_muebles = "reparacion_muebles"  # Reparación de muebles
    aire_acondicionado = "aire_acondicionado"  # Aire acondicionado
    cerrajeria = "cerrajeria"  # Cerrajería
    electrodomesticos = "electrodomesticos"  # Electrodomésticos
    otro = "otro"  # Otro


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
    critical = "critical"  # Crítico


class Maintenance(Base):
    """Registro de tareas de mantenimiento y limpieza."""
    __tablename__ = "maintenances"

    id = Column(Integer, primary_key=True, index=True)

    # Relaciones
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False, index=True)
    assigned_to = Column(Integer, ForeignKey("staff.id"), nullable=True)  # Staff asignado

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

    # Información de la tarea
    title = Column(String(200), nullable=False)  # Título del mantenimiento
    description = Column(Text, nullable=True)  # Descripción del problema/tarea
    notes = Column(Text, nullable=True)  # Notas adicionales o resultado

    # Fechas
    reported_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    # Costos
    estimated_cost = Column(Float, nullable=True)  # Costo estimado
    actual_cost = Column(Float, nullable=True)  # Costo real

    # Relaciones
    room = relationship("Room", back_populates="maintenances")
    staff = relationship("Staff", foreign_keys=[assigned_to], backref="maintenances")
    inventory_usages = relationship(
        "MaintenanceInventoryUsage",
        back_populates="maintenance",
        cascade="all, delete-orphan",
    )

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
