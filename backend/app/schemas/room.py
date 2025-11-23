# app/schemas/room.py
from typing import Optional, Literal

from pydantic import BaseModel, ConfigDict, Field

# Importa el mismo Enum que usa tu modelo SQLAlchemy
from ..models.room import RoomType


class RoomBase(BaseModel):
    number: str
    type: RoomType
    notes: Optional[str] = None

    # Esto hace que Pydantic emita "single" / "double" / "suite"
    model_config = ConfigDict(use_enum_values=True)


class RoomCreate(RoomBase):
    price_amount: Optional[float] = Field(None, description="Precio de la habitación (se convertirá a Bs)")
    price_currency: Optional[Literal["VES", "USD", "EUR"]] = Field(None, description="Moneda del precio ingresado (VES, USD, EUR)")


class RoomUpdate(BaseModel):
    number: Optional[str] = None
    type: Optional[RoomType] = None
    price_amount: Optional[float] = Field(None, description="Precio de la habitación")
    price_currency: Optional[Literal["VES", "USD", "EUR"]] = Field(None, description="Moneda del precio")
    notes: Optional[str] = None

    model_config = ConfigDict(use_enum_values=True)


class RoomOut(RoomBase):
    id: int
    price_bs: Optional[float] = Field(None, description="Precio en Bolívares")

    model_config = ConfigDict(use_enum_values=True, from_attributes=True)


class RoomListResponse(BaseModel):
    items: list[RoomOut]
    total: int

    model_config = ConfigDict(from_attributes=True)
