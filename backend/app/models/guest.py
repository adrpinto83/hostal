
from sqlalchemy import String, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..core.db import Base

class Guest(Base):
    __tablename__ = "guests"
    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(255), index=True)
    document_id: Mapped[str] = mapped_column(String(100), index=True)
    phone: Mapped[str] = mapped_column(String(50), nullable=True)
    email: Mapped[str] = mapped_column(String(255), nullable=True)
    notes: Mapped[str] = mapped_column(String(500), nullable=True)
    devices = relationship("Device", back_populates="guest", cascade="all, delete-orphan")
