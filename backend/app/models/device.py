from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.db import Base


class Device(Base):
    __tablename__ = "devices"
    id: Mapped[int] = mapped_column(primary_key=True)
    guest_id: Mapped[int] = mapped_column(ForeignKey("guests.id", ondelete="CASCADE"), index=True)
    mac: Mapped[str] = mapped_column(String(17), nullable=False, index=True)  # AA:BB:CC:DD:EE:FF
    name: Mapped[str] = mapped_column(String(100), nullable=True)  # e.g. "iPhone 14"
    vendor: Mapped[str] = mapped_column(String(100), nullable=True)
    allowed: Mapped[bool] = mapped_column(Boolean, default=True)  # whitelist flag
    guest = relationship("Guest", back_populates="devices")
