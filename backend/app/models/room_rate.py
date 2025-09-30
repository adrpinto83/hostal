# solo muestra la parte relevante para back_populates
from enum import Enum

from sqlalchemy import Column, ForeignKey, Integer, Numeric, Text, UniqueConstraint
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import relationship

from ..core.db import Base


class Period(str, Enum):
    day = "day"
    week = "week"
    fortnight = "fortnight"
    month = "month"


class RoomRate(Base):
    __tablename__ = "room_rates"
    __table_args__ = (UniqueConstraint("room_id", "period", name="uq_room_rates_room_period"),)

    id = Column(Integer, primary_key=True)
    room_id = Column(
        Integer, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False, index=True
    )
    period = Column(SAEnum(Period, name="period", create_constraint=True), nullable=False)
    price_bs = Column(Numeric(12, 2), nullable=False)
    currency_note = Column(Text, nullable=True)

    room = relationship("Room", back_populates="rates")
