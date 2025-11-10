# app/models/occupancy.py
"""
Modelo para ocupaciones de habitaciones.
Registra check-in/check-out real de huéspedes en habitaciones.
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from ..core.db import Base


class Occupancy(Base):
    """Registro de ocupación real de una habitación por un huésped."""
    __tablename__ = "occupancies"

    id = Column(Integer, primary_key=True, index=True)

    # Relaciones
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False, index=True)
    guest_id = Column(Integer, ForeignKey("guests.id"), nullable=False, index=True)
    reservation_id = Column(Integer, ForeignKey("reservations.id"), nullable=True)  # Puede ser walk-in

    # Fechas y tiempos
    check_in = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    check_out = Column(DateTime, nullable=True, index=True)  # Null si aún está ocupado

    # Información financiera
    amount_paid_bs = Column(Float, nullable=True)  # Monto pagado en bolívares
    amount_paid_usd = Column(Float, nullable=True)  # Monto pagado en dólares (común en Venezuela)
    payment_method = Column(String(50), nullable=True)  # efectivo, transferencia, zelle, paypal, etc.

    # Notas
    notes = Column(Text, nullable=True)

    # Relaciones
    room = relationship("Room", back_populates="occupancies")
    guest = relationship("Guest")
    reservation = relationship("Reservation")

    @property
    def is_active(self) -> bool:
        """Verifica si la ocupación está activa (no ha hecho check-out)."""
        return self.check_out is None

    @property
    def duration_hours(self) -> float | None:
        """Calcula la duración de la ocupación en horas."""
        if self.check_out:
            delta = self.check_out - self.check_in
            return delta.total_seconds() / 3600
        return None
