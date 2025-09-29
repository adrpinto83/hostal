from __future__ import annotations

from enum import Enum
from sqlalchemy import Column, Integer, String, Text, Enum as SAEnum, UniqueConstraint
from sqlalchemy.orm import relationship

from ..core.db import Base


class RoomType(str, Enum):
    single = "single"
    double = "double"
    suite = "suite"


class Room(Base):
    __tablename__ = "rooms"
    __table_args__ = (
        UniqueConstraint("number", name="uq_rooms_number"),
    )

    id = Column(Integer, primary_key=True, index=True)
    number = Column(String(20), nullable=False, index=True)
    type = Column(SAEnum(RoomType, name="room_type", create_constraint=True), nullable=False)
    notes = Column(Text, nullable=True)

    # Relaciones opcionales (si existen estos modelos)
    rates = relationship("RoomRate", back_populates="room", cascade="all, delete-orphan", lazy="selectin")
    reservations = relationship("Reservation", back_populates="room", cascade="all, delete-orphan", lazy="selectin")
