from __future__ import annotations

from sqlalchemy import Column, Enum, Float, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.db import Base
from app.models.reservation import Period


class RoomRate(Base):
    __tablename__ = "room_rates"

    id = Column(Integer, primary_key=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    period = Column(Enum(Period), nullable=False)  # <-- Enum consistente
    price_bs = Column(Float, nullable=False)

    room = relationship("Room")

    __table_args__ = (UniqueConstraint("room_id", "period", name="uq_room_rate_room_period"),)
