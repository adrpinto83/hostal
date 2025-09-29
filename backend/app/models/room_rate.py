# app/models/room_rate.py
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, Numeric, String, Enum, ForeignKey
from ..core.db import Base

PeriodEnumName = "period"  # ya existe como tipo en Postgres por migración

class RoomRate(Base):
    __tablename__ = "room_rates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id", ondelete="CASCADE"), index=True)
    period: Mapped[str] = mapped_column(Enum(name=PeriodEnumName, create_type=False), index=True)
    price_bs: Mapped[str] = mapped_column(Numeric(12,2))
    currency_note: Mapped[str | None] = mapped_column(String(50))
