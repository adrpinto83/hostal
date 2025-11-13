# app/models/staff.py
"""Modelo para personal del hostal (limpieza, mantenimiento, recepción, etc.)."""
from __future__ import annotations

from datetime import datetime
from enum import Enum

from sqlalchemy import Column, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy import Enum as SAEnum

from ..core.db import Base


class StaffRole(str, Enum):
    """Roles del personal del hostal."""
    recepcionista = "recepcionista"  # Recepcionista
    limpieza = "limpieza"  # Personal de limpieza
    mantenimiento = "mantenimiento"  # Personal de mantenimiento
    gerente = "gerente"  # Gerente
    seguridad = "seguridad"  # Seguridad


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
        server_default="active",
        index=True
    )
    hire_date = Column(Date, nullable=True)  # Fecha de contratación
    salary = Column(Float, nullable=True)  # Salario

    # Notas
    notes = Column(Text, nullable=True)

    # Sistema de usuarios - Un empleado puede estar asociado a una cuenta del sistema
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, unique=True, index=True)

    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, server_default="now()")
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, server_default="now()", onupdate=datetime.utcnow)
