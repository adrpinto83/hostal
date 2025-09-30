# fragmento clave de relaciones
from enum import Enum

from sqlalchemy import (
    Column,
    Date,
    ForeignKey,
    Integer,
    Numeric,
    Text,
)
from sqlalchemy import (
    Enum as SAEnum,
)
from sqlalchemy.orm import relationship

from ..core.db import Base


class ReservationStatus(str, Enum):
    pending = "pending"
    active = "active"
    checked_out = "checked_out"
    cancelled = "cancelled"


class Period(str, Enum):
    day = "day"
    week = "week"
    fortnight = "fortnight"
    month = "month"


class Reservation(Base):
    __tablename__ = "reservations"

    id = Column(Integer, primary_key=True)
    guest_id = Column(
        Integer, ForeignKey("guests.id", ondelete="CASCADE"), nullable=False, index=True
    )
    room_id = Column(
        Integer, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False, index=True
    )

    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=False, index=True)

    period = Column(SAEnum(Period, name="period", create_constraint=False), nullable=False)
    periods_count = Column(Integer, nullable=False, default=1)
    price_bs = Column(Numeric(12, 2), nullable=False)
    rate_usd = Column(Numeric(12, 2), nullable=True)
    rate_eur = Column(Numeric(12, 2), nullable=True)
    status = Column(
        SAEnum(ReservationStatus, name="reservation_status", create_constraint=True),
        nullable=False,
        default=ReservationStatus.pending,
    )
    notes = Column(Text, nullable=True)

    room = relationship("Room", back_populates="reservations")
