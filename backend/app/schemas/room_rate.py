# app/schemas/room_rate.py
from typing import Optional
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, field_serializer

# Usa el mismo Enum "Period" que usan tus modelos
# Si lo declaraste en models.reservation, importa desde ahí:
from ..models.reservation import Period
# (Si tu Enum Period vive en otro módulo, ajusta el import)

class RoomRateBase(BaseModel):
    period: Period
    # Internamente seguimos usando Decimal para precisión
    price_bs: Decimal
    currency_note: Optional[str] = None

    model_config = ConfigDict(use_enum_values=True)

    # Para la salida JSON, transformar Decimal -> string
    @field_serializer("price_bs", when_used="json")
    def ser_decimal(self, v: Decimal):
        return format(v, "f")


class RoomRateCreate(RoomRateBase):
    pass


class RoomRateOut(RoomRateBase):
    id: int
    room_id: int
