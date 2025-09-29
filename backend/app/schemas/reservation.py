# app/schemas/reservation.py
from typing import Optional
from decimal import Decimal
from datetime import date
from pydantic import BaseModel, ConfigDict, field_serializer

# Importa los mismos Enums que usa el modelo
from ..models.reservation import Period, ReservationStatus


class ReservationCreate(BaseModel):
    guest_id: int
    room_id: int
    start_date: date
    period: Period
    periods_count: int = 1
    price_bs: Optional[Decimal] = None
    notes: Optional[str] = None

    model_config = ConfigDict(use_enum_values=True)


class ReservationOut(BaseModel):
    id: int
    guest_id: int
    room_id: int
    start_date: date
    end_date: date
    period: Period
    periods_count: int
    price_bs: Decimal
    rate_usd: Optional[Decimal] = None
    rate_eur: Optional[Decimal] = None
    status: ReservationStatus
    notes: Optional[str] = None

    model_config = ConfigDict(use_enum_values=True)

    # Serializar Decimals como string en JSON
    @field_serializer("price_bs", "rate_usd", "rate_eur", when_used="json")
    def ser_decimal(self, v: Optional[Decimal]):
        return None if v is None else format(v, "f")
