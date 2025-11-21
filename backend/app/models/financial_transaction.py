# app/models/financial_transaction.py
"""
Modelo para rastrear todas las transacciones financieras del hostal.
Proporciona una vista unificada de movimientos monetarios.
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text, JSON, Index
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import relationship

from ..core.db import Base


class TransactionType(str, Enum):
    """Tipos de transacciones financieras."""
    payment = "payment"              # Pago de huésped
    refund = "refund"                # Reembolso
    deposit = "deposit"              # Depósito
    adjustment = "adjustment"        # Ajuste manual
    invoice = "invoice"              # Factura emitida
    expense = "expense"              # Gasto
    fee = "fee"                      # Tarifa o comisión
    tip = "tip"                      # Propina
    credit = "credit"                # Crédito


class TransactionStatus(str, Enum):
    """Estado de una transacción."""
    pending = "pending"              # Pendiente
    processing = "processing"        # En proceso
    completed = "completed"          # Completada
    failed = "failed"                # Fallida
    refunded = "refunded"            # Reembolsada
    disputed = "disputed"            # Disputada


class PaymentGateway(str, Enum):
    """Pasarelas de pago identificadas."""
    stripe = "stripe"
    paypal = "paypal"
    manual = "manual"                # Entrada manual
    bank_transfer = "bank_transfer"  # Transferencia bancaria
    cash = "cash"                    # Efectivo
    mobile_payment = "mobile_payment"  # Pago móvil (Venezuela)
    crypto = "crypto"                # Criptomoneda
    other = "other"


class FinancialTransaction(Base):
    """Rastreo unificado de transacciones financieras."""
    __tablename__ = "financial_transactions"

    id = Column(Integer, primary_key=True, index=True)

    # Tipo y estado
    transaction_type = Column(
        SAEnum(TransactionType, name="transaction_type", create_constraint=True),
        nullable=False,
        index=True
    )
    status = Column(
        SAEnum(TransactionStatus, name="transaction_status", create_constraint=True),
        nullable=False,
        default=TransactionStatus.pending,
        server_default="pending",
        index=True
    )

    # Referencias (puede estar vinculado a varios items)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True, index=True)
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=True, index=True)
    guest_id = Column(Integer, ForeignKey("guests.id"), nullable=True, index=True)
    reservation_id = Column(Integer, ForeignKey("reservations.id"), nullable=True, index=True)

    # Persona que creó la transacción
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Montos
    amount = Column(Float, nullable=False)
    currency = Column(String(3), nullable=False, default="VES", index=True)
    amount_ves = Column(Float, nullable=False)  # Monto normalizado a VES

    # Información de pasarela de pago
    gateway = Column(
        SAEnum(PaymentGateway, name="payment_gateway", create_constraint=True),
        nullable=False,
        index=True
    )
    gateway_transaction_id = Column(String(200), nullable=True, index=True)
    gateway_reference = Column(String(200), nullable=True)

    # Información del pago/transacción
    description = Column(String(500), nullable=False)
    notes = Column(Text, nullable=True)

    # Metadata flexible para información adicional
    transaction_metadata = Column(JSON, nullable=True)  # {
    #     "stripe_charge_id": "ch_xxx",
    #     "invoice_number": "INV-2024-001",
    #     "room_id": 5,
    #     "period": "month"
    # }

    # Información de error (si falló)
    error_code = Column(String(100), nullable=True)
    error_message = Column(Text, nullable=True)

    # Auditoría temporal
    transaction_date = Column(DateTime, nullable=False, index=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones
    invoice = relationship("Invoice")
    payment = relationship("Payment")
    guest = relationship("Guest")
    reservation = relationship("Reservation")
    creator = relationship("User", foreign_keys=[created_by_user_id])

    # Índices para queries frecuentes
    __table_args__ = (
        Index("idx_transaction_guest_date", guest_id, transaction_date),
        Index("idx_transaction_type_date", transaction_type, transaction_date),
        Index("idx_transaction_status_date", status, transaction_date),
        Index("idx_transaction_gateway_date", gateway, transaction_date),
        Index("idx_transaction_invoice", invoice_id),
        Index("idx_transaction_payment", payment_id),
        Index("idx_transaction_gateway_ref", gateway_transaction_id),
    )

    def __repr__(self):
        return f"<FinancialTransaction {self.transaction_type}: {self.amount} {self.currency} ({self.status})>"


class ExchangeRateSnapshot(Base):
    """Snapshot de tasas de cambio en un momento específico."""
    __tablename__ = "exchange_rate_snapshots"

    id = Column(Integer, primary_key=True, index=True)

    # Tasas de cambio en ese momento
    # Todas relativas a VES (Bolívares como base)
    ves_to_usd = Column(Float, nullable=False)
    ves_to_eur = Column(Float, nullable=False)
    usd_to_eur = Column(Float, nullable=False)

    # Fuente de los datos
    source = Column(String(100), nullable=False)  # dolarapi, exchangerate-api, manual, etc
    is_manual = Column(Integer, nullable=False, default=0)  # 0 = automático, 1 = manual

    # Auditoría
    snapshot_date = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_rate_snapshot_date", snapshot_date),
    )

    def __repr__(self):
        return f"<ExchangeRateSnapshot {self.snapshot_date}: 1 VES = {1/self.ves_to_usd:.4f} USD>"
