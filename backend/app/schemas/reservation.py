from __future__ import annotations

from datetime import date

from pydantic import BaseModel, ConfigDict, Field

from app.models.reservation import Period as PeriodEnum
from app.models.reservation import ReservationStatus


class ReservationBase(BaseModel):
    guest_id: int = Field(..., description="ID del huésped", examples=[1])
    room_id: int = Field(..., description="ID de la habitación", examples=[1])
    start_date: date = Field(..., description="Fecha de inicio de la reserva", examples=["2025-01-15"])
    periods_count: int = Field(..., gt=0, description="Cantidad de períodos", examples=[2])
    period: PeriodEnum | str = Field(..., description="Tipo de período (day, week, fortnight, month)", examples=["week"])
    price_bs: float | None = Field(None, description="Precio total en bolívares (calculado automáticamente si no se provee)", examples=[1000.0])
    notes: str | None = Field(None, description="Notas adicionales", examples=["Cliente corporativo"])


class ReservationCreate(ReservationBase):
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "guest_id": 1,
                    "room_id": 2,
                    "start_date": "2025-01-15",
                    "periods_count": 2,
                    "period": "week",
                    "notes": "Reserva para evento corporativo"
                }
            ]
        }
    )


from app.schemas.guest import GuestOut
from app.schemas.room import RoomOut


class ReservationOut(BaseModel):
    id: int
    start_date: date
    end_date: date
    periods_count: int
    period: PeriodEnum
    price_bs: float
    status: ReservationStatus
    notes: str | None = None
    cancellation_reason: str | None = None
    guest: GuestOut
    room: RoomOut

    model_config = ConfigDict(from_attributes=True)


class ReservationCancel(BaseModel):
    cancellation_reason: str = Field(..., min_length=10, max_length=500, description="Razón de cancelación")


class ReservationListResponse(BaseModel):
    items: list[ReservationOut]
    total: int

    model_config = ConfigDict(from_attributes=True)
