# app/models/payment.py
"""
Sistema de pagos multimoneda para el hostal.
Soporta EUR, VES (Bolívares), USD con conversión automática.
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text, JSON, Boolean, Index
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

    # ===== Campos para Stripe (NEW) =====
    # IDs de Stripe
    stripe_payment_intent_id = Column(String(255), nullable=True, unique=True, index=True)  # pi_xxx
    stripe_charge_id = Column(String(255), nullable=True, unique=True, index=True)  # ch_xxx
    stripe_payment_method_id = Column(String(255), nullable=True)  # pm_xxx

    # Información de la transacción Stripe
    stripe_status = Column(String(50), nullable=True)  # succeeded, processing, requires_action, etc
    stripe_metadata = Column(JSON, nullable=True)  # Metadata guardada en Stripe
    stripe_error_code = Column(String(100), nullable=True)  # Código de error si falló
    stripe_error_message = Column(Text, nullable=True)  # Mensaje de error detallado

    # Webhook tracking
    webhook_processed = Column(Boolean, nullable=False, default=False)
    webhook_processed_at = Column(DateTime, nullable=True)
    stripe_webhook_event_id = Column(String(100), nullable=True)  # Referencia al webhook

    # Récord de intentos
    stripe_attempt_count = Column(Integer, nullable=False, default=0)
    stripe_last_error_at = Column(DateTime, nullable=True)

    # ===== Fin de campos Stripe =====

    # Auditoría
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # Usuario que registró
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones
    guest = relationship("Guest")
    reservation = relationship("Reservation")
    occupancy = relationship("Occupancy")
    creator = relationship("User", foreign_keys=[created_by])

    # Índices para queries de Stripe
    __table_args__ = (
        Index("idx_payment_stripe_intent", stripe_payment_intent_id),
        Index("idx_payment_stripe_charge", stripe_charge_id),
        Index("idx_payment_status_date", status, payment_date),
        Index("idx_payment_guest_date", guest_id, payment_date),
    )

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
