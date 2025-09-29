# app/models/reservation.py
from datetime import date
from decimal import Decimal
import enum

from sqlalchemy import Integer, String, ForeignKey, Date, Numeric, Enum
from sqlalchemy.orm import Mapped, mapped_column
from ..core.db import Base

class Period(enum.Enum):
    day = "day"
    week = "week"
    fortnight = "fortnight"
    month = "month"

class ReservationStatus(enum.Enum):
    pending = "pending"
    active = "active"
    checked_out = "checked_out"
    cancelled = "cancelled"

class Reservation(Base):
    __tablename__ = "reservations"

    id: Mapped[int] = mapped_column(primary_key=True)
    guest_id: Mapped[int] = mapped_column(ForeignKey("guests.id", ondelete="RESTRICT"), index=True, nullable=False)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id", ondelete="RESTRICT"), index=True, nullable=False)

    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)

    period: Mapped[Period] = mapped_column(Enum(Period, name="period"), nullable=False)
    periods_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    price_bs: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    rate_usd: Mapped[Decimal | None] = mapped_column(Numeric(12, 6))
    rate_eur: Mapped[Decimal | None] = mapped_column(Numeric(12, 6))

    status: Mapped[ReservationStatus] = mapped_column(
        Enum(ReservationStatus, name="reservationstatus"),
        nullable=False,
        default=ReservationStatus.pending,
    )
    notes: Mapped[str | None] = mapped_column(String(500))
