# app/schemas/room_rate.py
from pydantic import BaseModel, condecimal
from decimal import Decimal
from typing import Literal

PeriodLiteral = Literal["day", "week", "fortnight", "month"]

class RoomRateBase(BaseModel):
    period: PeriodLiteral
    price_bs: condecimal(max_digits=12, decimal_places=2)
    currency_note: str | None = None

class RoomRateCreate(RoomRateBase):
    pass

class RoomRateOut(RoomRateBase):
    id: int
    room_id: int
    class Config:
        from_attributes = True
