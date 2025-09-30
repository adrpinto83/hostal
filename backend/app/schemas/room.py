# app/schemas/room.py
from typing import Optional

from pydantic import BaseModel, ConfigDict

# Importa el mismo Enum que usa tu modelo SQLAlchemy
from ..models.room import RoomType


class RoomBase(BaseModel):
    number: str
    type: RoomType
    notes: Optional[str] = None

    # Esto hace que Pydantic emita "single" / "double" / "suite"
    model_config = ConfigDict(use_enum_values=True)


class RoomCreate(RoomBase):
    pass


class RoomUpdate(BaseModel):
    number: Optional[str] = None
    type: Optional[RoomType] = None
    notes: Optional[str] = None

    model_config = ConfigDict(use_enum_values=True)


class RoomOut(RoomBase):
    id: int

    model_config = ConfigDict(use_enum_values=True)
