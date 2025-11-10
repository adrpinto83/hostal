# app/models/payment.py
"""
Sistema de pagos multimoneda para el hostal.
Soporta EUR, VES (Bolívares), USD con conversión automática.
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import relationship

from ..core.db import Base


class Currency(str, Enum):
    """Monedas soportadas."""
    EUR = "EUR"  # Euro
    USD = "USD"  # Dólar estadounidense
    VES = "VES"  # Bolívar venezolano


class PaymentMethod(str, Enum):
    """Métodos de pago."""
    cash = "cash"  # Efectivo
    card = "card"  # Tarjeta de crédito/débito
    transfer = "transfer"  # Transferencia bancaria
    mobile_payment = "mobile_payment"  # Pago móvil (Venezuela)
    zelle = "zelle"  # Zelle
    paypal = "paypal"  # PayPal
    crypto = "crypto"  # Criptomonedas
    other = "other"  # Otro


class PaymentStatus(str, Enum):
    """Estado del pago."""
    pending = "pending"  # Pendiente
    completed = "completed"  # Completado
    failed = "failed"  # Fallido
    refunded = "refunded"  # Reembolsado
    cancelled = "cancelled"  # Cancelado


class Payment(Base):
    """Registro de pagos del hostal con soporte multimoneda."""
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)

    # Relaciones
    guest_id = Column(Integer, ForeignKey("guests.id"), nullable=False, index=True)
    reservation_id = Column(Integer, ForeignKey("reservations.id"), nullable=True, index=True)
    occupancy_id = Column(Integer, ForeignKey("occupancies.id"), nullable=True, index=True)

    # Información del pago
    amount = Column(Float, nullable=False)  # Monto en la moneda original
    currency = Column(
        SAEnum(Currency, name="currency", create_constraint=True),
        nullable=False,
        index=True
    )

    # Conversiones a otras monedas (calculadas en el momento del pago)
    amount_eur = Column(Float, nullable=True)  # Equivalente en EUR
    amount_usd = Column(Float, nullable=True)  # Equivalente en USD
    amount_ves = Column(Float, nullable=True)  # Equivalente en VES

    # Tasa de cambio usada
    exchange_rate_eur = Column(Float, nullable=True)  # Tasa EUR usada
    exchange_rate_usd = Column(Float, nullable=True)  # Tasa USD usada
    exchange_rate_ves = Column(Float, nullable=True)  # Tasa VES usada

    # Detalles del pago
    method = Column(
        SAEnum(PaymentMethod, name="payment_method", create_constraint=True),
        nullable=False
    )
    status = Column(
        SAEnum(PaymentStatus, name="payment_status", create_constraint=True),
        nullable=False,
        default=PaymentStatus.pending,
        server_default="pending"
    )

    # Información adicional
    reference_number = Column(String(100), nullable=True)  # Número de referencia/transacción
    notes = Column(Text, nullable=True)
    payment_date = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)

    # Auditoría
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # Usuario que registró
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relaciones
    guest = relationship("Guest")
    reservation = relationship("Reservation")
    occupancy = relationship("Occupancy")
    creator = relationship("User", foreign_keys=[created_by])

    @property
    def amount_in_currency(self, target_currency: str) -> float:
        """Retorna el monto en la moneda especificada."""
        if target_currency == "EUR":
            return self.amount_eur or 0
        elif target_currency == "USD":
            return self.amount_usd or 0
        elif target_currency == "VES":
            return self.amount_ves or 0
        return self.amount
