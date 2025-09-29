# app/schemas/reservation.py
from pydantic import BaseModel, conint, condecimal
from typing import Literal
from datetime import date
from decimal import Decimal

PeriodLiteral = Literal["day","week","fortnight","month"]
StatusLiteral = Literal["pending","active","checked_out","cancelled"]

class ReservationCreate(BaseModel):
    guest_id: int
    room_id: int
    start_date: date
    period: PeriodLiteral
    periods_count: conint(ge=1) = 1
    price_bs: condecimal(max_digits=12, decimal_places=2) | None = None
    notes: str | None = None

class ReservationOut(BaseModel):
    id: int
    guest_id: int
    room_id: int
    start_date: date
    end_date: date
    period: PeriodLiteral
    periods_count: int
    price_bs: condecimal(max_digits=12, decimal_places=2)
    rate_usd: Decimal | None = None
    rate_eur: Decimal | None = None
    status: StatusLiteral
    notes: str | None = None
    class Config:
        from_attributes = True

