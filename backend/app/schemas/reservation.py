from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field

from app.models.reservation import Period as PeriodEnum
from app.models.reservation import ReservationStatus


class ReservationBase(BaseModel):
    guest_id: int
    room_id: int
    start_date: date
    periods_count: int = Field(gt=0)
    period: PeriodEnum | str
    price_bs: float | None = None
    notes: str | None = None


class ReservationCreate(ReservationBase):
    pass


class ReservationOut(BaseModel):
    id: int
    guest_id: int
    room_id: int
    start_date: date
    end_date: date
    periods_count: int
    period: PeriodEnum
    price_bs: float
    status: ReservationStatus
    notes: str | None = None

    class Config:
        from_attributes = True
