# app/models/room.py
from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from ..core.db import Base

class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[int] = mapped_column(primary_key=True)
    number: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    type: Mapped[str | None] = mapped_column(String(50))
    notes: Mapped[str | None] = mapped_column(String(500))

