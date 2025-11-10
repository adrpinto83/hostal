# app/models/staff.py
"""Modelo para personal del hostal (limpieza, mantenimiento, recepción, etc.)."""
from __future__ import annotations

from enum import Enum

from sqlalchemy import Boolean, Column, Integer, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import relationship

from ..core.db import Base


class StaffRole(str, Enum):
    """Roles del personal del hostal."""
    receptionist = "receptionist"  # Recepcionista
    cleaner = "cleaner"  # Personal de limpieza
    maintenance = "maintenance"  # Personal de mantenimiento
    manager = "manager"  # Gerente
    security = "security"  # Seguridad


class StaffStatus(str, Enum):
    """Estado del empleado."""
    active = "active"  # Activo
    inactive = "inactive"  # Inactivo
    on_leave = "on_leave"  # De permiso
    terminated = "terminated"  # Desvinculado


class Staff(Base):
    """Personal del hostal."""
    __tablename__ = "staff"

    id = Column(Integer, primary_key=True, index=True)

    # Información personal
    full_name = Column(String(255), nullable=False, index=True)
    document_id = Column(String(100), unique=True, nullable=False, index=True)  # Cédula venezolana
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)

    # Información laboral
    role = Column(
        SAEnum(StaffRole, name="staff_role", create_constraint=True),
        nullable=False,
        index=True
    )
    status = Column(
        SAEnum(StaffStatus, name="staff_status", create_constraint=True),
        nullable=False,
        default=StaffStatus.active,
        server_default="active"
    )

    # Configuración
    can_access_admin = Column(Boolean, default=False)  # Acceso al panel administrativo
    notes = Column(String(500), nullable=True)

    # Relaciones
    maintenances = relationship("Maintenance", back_populates="staff")
