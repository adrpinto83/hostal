from __future__ import annotations

import enum

from sqlalchemy import Column, Date, Enum, Float, ForeignKey, Index, Integer, Text
from sqlalchemy.orm import relationship

from app.core.db import Base


class Period(str, enum.Enum):
    day = "day"
    week = "week"
    fortnight = "fortnight"
    month = "month"


class ReservationStatus(str, enum.Enum):
    pending = "pending"
    active = "active"
    checked_out = "checked_out"
    cancelled = "cancelled"


class Reservation(Base):
    __tablename__ = "reservations"

    id = Column(Integer, primary_key=True)
    guest_id = Column(Integer, ForeignKey("guests.id"), nullable=False)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    period = Column(Enum(Period), nullable=False)
    periods_count = Column(Integer, nullable=False)
    price_bs = Column(Float, nullable=False)
    status = Column(Enum(ReservationStatus), nullable=False, default=ReservationStatus.pending)
    notes = Column(Text)
    cancellation_reason = Column(Text)

    guest = relationship("Guest")
    room = relationship("Room")

    __table_args__ = (Index("ix_res_room_range", "room_id", "start_date", "end_date"),)
