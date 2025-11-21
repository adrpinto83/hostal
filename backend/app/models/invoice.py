# app/models/invoice.py
"""
Sistema de facturación para el hostal.
Genera y gestiona facturas automáticamente vinculadas a reservas.
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import (
    Column, DateTime, Float, ForeignKey, Integer, String, Text, Boolean,
    JSON, Index
)
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import relationship

from ..core.db import Base


class InvoiceStatus(str, Enum):
    """Estados de una factura."""
    draft = "draft"                    # Borrador
    issued = "issued"                  # Emitida
    sent = "sent"                      # Enviada
    viewed = "viewed"                  # Vista
    pending = "pending"                # Pendiente de pago
    partially_paid = "partially_paid"  # Parcialmente pagada
    paid = "paid"                      # Pagada
    overdue = "overdue"                # Vencida
    cancelled = "cancelled"            # Cancelada
    refunded = "refunded"              # Reembolsada


class InvoiceLineItemType(str, Enum):
    """Tipo de línea en factura."""
    room_charge = "room_charge"        # Cargo por habitación
    service = "service"                # Servicio adicional
    tax = "tax"                        # Impuesto
    discount = "discount"              # Descuento
    fee = "fee"                        # Tarifa
    other = "other"                    # Otro


class Invoice(Base):
    """Factura para huéspedes."""
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)

    # Relaciones
    guest_id = Column(Integer, ForeignKey("guests.id"), nullable=False, index=True)
    reservation_id = Column(Integer, ForeignKey("reservations.id"), nullable=True, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Número de factura (secuencial, único)
    invoice_number = Column(String(50), unique=True, nullable=False, index=True)

    # Fechas
    issue_date = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    due_date = Column(DateTime, nullable=False, index=True)
    paid_date = Column(DateTime, nullable=True)

    # Montos (todos en Bolívares como base)
    subtotal = Column(Float, nullable=False, default=0.0)  # Subtotal en VES
    tax_amount = Column(Float, nullable=False, default=0.0)  # Impuestos en VES
    total = Column(Float, nullable=False)  # Total en VES
    paid_amount = Column(Float, nullable=False, default=0.0)  # Monto pagado
    remaining_balance = Column(Float, nullable=False)  # Saldo pendiente

    # Montos en otras monedas (calculados y guardados en el momento)
    total_usd = Column(Float, nullable=True)
    total_eur = Column(Float, nullable=True)
    exchange_rates = Column(JSON, nullable=True)  # {"USD": 2.5, "EUR": 2.7} en el momento de emisión

    # Estado
    status = Column(
        SAEnum(InvoiceStatus, name="invoice_status", create_constraint=True),
        nullable=False,
        default=InvoiceStatus.draft,
        server_default="draft",
        index=True
    )

    # Información adicional
    notes = Column(Text, nullable=True)
    terms_conditions = Column(Text, nullable=True)

    # PDF Storage
    pdf_url = Column(String(500), nullable=True)  # URL o path al PDF
    pdf_generated_at = Column(DateTime, nullable=True)

    # Email tracking
    email_sent_count = Column(Integer, nullable=False, default=0)
    email_sent_at = Column(DateTime, nullable=True)
    email_viewed_at = Column(DateTime, nullable=True)
    viewed_by_guest = Column(Boolean, nullable=False, default=False)

    # Auditoría
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones
    guest = relationship("Guest", back_populates="invoices")
    reservation = relationship("Reservation", back_populates="invoice")
    creator = relationship("User", foreign_keys=[created_by])
    line_items = relationship("InvoiceLineItem", back_populates="invoice", cascade="all, delete-orphan")
    payments = relationship("InvoicePayment", back_populates="invoice", cascade="all, delete-orphan")

    # Índices compuestos para queries frecuentes
    __table_args__ = (
        Index("idx_invoice_guest_date", guest_id, issue_date),
        Index("idx_invoice_status_date", status, issue_date),
        Index("idx_invoice_due_date", due_date),
    )

    def __repr__(self):
        return f"<Invoice {self.invoice_number}: {self.total} VES ({self.status})>"


class InvoiceLineItem(Base):
    """Línea de detalle en una factura."""
    __tablename__ = "invoice_line_items"

    id = Column(Integer, primary_key=True, index=True)

    # Relación con factura
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False, index=True)

    # Descripción del item
    description = Column(String(500), nullable=False)
    item_type = Column(
        SAEnum(InvoiceLineItemType, name="invoice_line_item_type", create_constraint=True),
        nullable=False,
        default=InvoiceLineItemType.service
    )

    # Cantidades y precios
    quantity = Column(Float, nullable=False, default=1.0)
    unit_price = Column(Float, nullable=False)  # Precio unitario en VES
    total_price = Column(Float, nullable=False)  # Cantidad x Precio

    # Opcional: descuento o recargo
    discount_percent = Column(Float, nullable=False, default=0.0)  # Porcentaje de descuento
    discount_amount = Column(Float, nullable=False, default=0.0)  # Monto de descuento

    # Metadata (enlace a qué generó este item)
    metadata = Column(JSON, nullable=True)  # {"reservation_id": 123, "room_id": 5}

    # Auditoría
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relaciones
    invoice = relationship("Invoice", back_populates="line_items")

    def __repr__(self):
        return f"<LineItem {self.description}: {self.total_price} VES>"


class InvoicePayment(Base):
    """Registro de pagos aplicados a una factura."""
    __tablename__ = "invoice_payments"

    id = Column(Integer, primary_key=True, index=True)

    # Relaciones
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False, index=True)
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=True, index=True)

    # Monto pagado
    amount_paid = Column(Float, nullable=False)
    currency = Column(String(3), nullable=False, default="VES")
    payment_date = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)

    # Referencia del pago
    payment_method = Column(String(50), nullable=False)  # stripe, manual, transfer, etc
    transaction_id = Column(String(200), nullable=True, unique=True)
    notes = Column(Text, nullable=True)

    # Auditoría
    recorded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relaciones
    invoice = relationship("Invoice", back_populates="payments")
    payment = relationship("Payment")
    recorder = relationship("User", foreign_keys=[recorded_by])

    def __repr__(self):
        return f"<InvoicePayment {self.amount_paid} VES on {self.payment_date}>"
