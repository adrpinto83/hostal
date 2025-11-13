from __future__ import annotations

from enum import Enum

from sqlalchemy import Column, Integer, String, Text, UniqueConstraint, Float
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import relationship

from ..core.db import Base


class RoomType(str, Enum):
    """Tipos de habitación disponibles."""
    single = "single"
    double = "double"
    suite = "suite"


class RoomStatus(str, Enum):
    """Estados operativos de una habitación."""
    available = "available"  # Disponible para reservar
    occupied = "occupied"  # Ocupada por huésped
    cleaning = "cleaning"  # En proceso de limpieza
    maintenance = "maintenance"  # En mantenimiento
    out_of_service = "out_of_service"  # Fuera de servicio


class Room(Base):
    __tablename__ = "rooms"
    __table_args__ = (UniqueConstraint("number", name="uq_rooms_number"),)

    id = Column(Integer, primary_key=True, index=True)
    number = Column(String(20), nullable=False, index=True)
    type = Column(SAEnum(RoomType, name="room_type", create_constraint=True), nullable=False)
    status = Column(
        SAEnum(RoomStatus, name="room_status", create_constraint=True),
        nullable=False,
        default=RoomStatus.available,
        server_default="available",
    )
    price_bs = Column(Float, nullable=True)  # Precio en Bolívares (moneda base)
    notes = Column(Text, nullable=True)

    # Relaciones
    rates = relationship(
        "RoomRate", back_populates="room", cascade="all, delete-orphan", lazy="selectin"
    )
    reservations = relationship(
        "Reservation", back_populates="room", cascade="all, delete-orphan", lazy="selectin"
    )
    occupancies = relationship(
        "Occupancy", back_populates="room", cascade="all, delete-orphan"
    )
    maintenances = relationship(
        "Maintenance", back_populates="room", cascade="all, delete-orphan"
    )
