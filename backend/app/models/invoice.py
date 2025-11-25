# app/models/invoice.py
"""Modelo para facturación homologada a normativas venezolanas."""
from __future__ import annotations

from datetime import datetime
from enum import Enum

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text, Boolean, Date
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import relationship

from ..core.db import Base


class InvoiceType(str, Enum):
    """Tipos de documentos fiscales permitidos en Venezuela."""
    factura = "factura"  # Factura de Venta
    nota_credito = "nota_credito"  # Nota de Crédito
    nota_debito = "nota_debito"  # Nota de Débito


class InvoiceStatus(str, Enum):
    """Estados de la factura."""
    draft = "draft"  # Borrador
    issued = "issued"  # Emitida
    cancelled = "cancelled"  # Anulada
    paid = "paid"  # Pagada


class PaymentStatus(str, Enum):
    """Estado de pago de la factura."""
    pending = "pending"  # Pendiente
    partial = "partial"  # Parcialmente pagada
    completed = "completed"  # Completamente pagada


class Invoice(Base):
    """Factura homologada a normativas venezolanas."""
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)

    # Información fiscal
    invoice_type = Column(SAEnum(InvoiceType, name="invoice_type"), nullable=False, default=InvoiceType.factura)
    control_number = Column(String(20), unique=True, nullable=False, index=True)  # Número de control SENIAT
    invoice_number = Column(Integer, nullable=False, index=True)  # Número secuencial de factura
    invoice_series = Column(String(10), nullable=False, default="A")  # Serie de la factura (A, B, C, etc)

    # Información del cliente
    guest_id = Column(Integer, ForeignKey("guests.id"), nullable=True, index=True)
    client_name = Column(String(255), nullable=False)
    client_rif = Column(String(50), nullable=True)  # RIF del cliente (sin guiones)
    client_email = Column(String(255), nullable=True)
    client_phone = Column(String(50), nullable=True)

    # Moneda y totales
    currency = Column(String(3), nullable=False, default="VES")  # VES, USD, EUR
    exchange_rate = Column(Float, nullable=False, default=1.0)  # Tasa de cambio respecto a VES

    subtotal = Column(Float, nullable=False)  # Subtotal sin IVA
    taxable_amount = Column(Float, nullable=False)  # Base imponible

    # IVA (16% es el estándar en Venezuela)
    tax_percentage = Column(Float, nullable=False, default=16.0)  # Porcentaje de IVA
    tax_amount = Column(Float, nullable=False)  # Monto de IVA

    # Retenciones
    iva_retention_percentage = Column(Float, nullable=False, default=0.0)  # Retención de IVA (50% sobre IVA)
    iva_retention_amount = Column(Float, nullable=False, default=0.0)  # Monto retenido de IVA

    islr_retention_percentage = Column(Float, nullable=False, default=0.0)  # Retención ISLR
    islr_retention_amount = Column(Float, nullable=False, default=0.0)  # Monto retenido de ISLR

    # Total final
    total = Column(Float, nullable=False)  # Total a pagar

    # Información de pago
    payment_status = Column(SAEnum(PaymentStatus, name="payment_status"), nullable=False, default=PaymentStatus.pending)
    paid_amount = Column(Float, nullable=False, default=0.0)  # Monto pagado hasta ahora

    # Estados
    status = Column(SAEnum(InvoiceStatus, name="invoice_status"), nullable=False, default=InvoiceStatus.draft)

    # Información adicional
    notes = Column(Text, nullable=True)
    internal_reference = Column(String(50), nullable=True)  # Referencia interna (número de reserva, etc)
    cancellation_reason = Column(Text, nullable=True)
    cancellation_authorization_code = Column(String(50), nullable=True)
    cancellation_authorized_at = Column(DateTime, nullable=True)
    cancellation_authorized_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Fecha y auditoría
    invoice_date = Column(Date, nullable=False, index=True)
    due_date = Column(Date, nullable=True)
    issued_at = Column(DateTime, nullable=True)  # Cuando se emitió la factura

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones
    guest = relationship("Guest", back_populates="invoices")
    lines = relationship("InvoiceLine", back_populates="invoice", cascade="all, delete-orphan")
    payments = relationship("InvoicePayment", back_populates="invoice", cascade="all, delete-orphan")


class InvoiceLine(Base):
    """Líneas de detalle de una factura."""
    __tablename__ = "invoice_lines"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False, index=True)

    # Descripción del item
    description = Column(String(255), nullable=False)
    code = Column(String(50), nullable=True)  # Código del producto/servicio

    # Cantidad y precio
    quantity = Column(Float, nullable=False)
    unit_price = Column(Float, nullable=False)  # Precio unitario

    # Total de la línea
    line_total = Column(Float, nullable=False)  # quantity * unit_price

    # Información fiscal
    is_taxable = Column(Boolean, nullable=False, default=True)  # Si está sujeta a IVA
    tax_percentage = Column(Float, nullable=False, default=16.0)
    tax_amount = Column(Float, nullable=False)

    # Orden de visualización
    line_order = Column(Integer, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relación
    invoice = relationship("Invoice", back_populates="lines")


class InvoicePayment(Base):
    """Registro de pagos de facturas."""
    __tablename__ = "invoice_payments"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False, index=True)

    # Información del pago
    amount = Column(Float, nullable=False)
    currency = Column(String(3), nullable=False, default="VES")
    exchange_rate = Column(Float, nullable=False, default=1.0)

    payment_method = Column(String(50), nullable=False)  # transfer, cash, card, mobile, etc
    payment_reference = Column(String(100), nullable=True)  # Número de referencia del pago

    # Descripción y notas
    notes = Column(Text, nullable=True)

    # Fechas
    payment_date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relación
    invoice = relationship("Invoice", back_populates="payments")


class InvoiceConfiguration(Base):
    """Configuración fiscal de la empresa para facturación."""
    __tablename__ = "invoice_configurations"

    id = Column(Integer, primary_key=True, index=True)

    # Información de la empresa
    company_name = Column(String(255), nullable=False)
    company_rif = Column(String(50), unique=True, nullable=False)  # RIF sin guiones (ej: 12345678901)

    # Dirección
    address = Column(String(255), nullable=False)
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    postal_code = Column(String(10), nullable=True)

    # Contacto
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    website = Column(String(255), nullable=True)

    # Configuración fiscal
    tax_percentage = Column(Float, nullable=False, default=16.0)  # IVA estándar
    enable_iva_retention = Column(Boolean, nullable=False, default=False)  # Aplicar retención de IVA
    iva_retention_percentage = Column(Float, nullable=False, default=75.0)  # 75% de retención

    enable_islr_retention = Column(Boolean, nullable=False, default=False)  # Aplicar retención ISLR
    islr_retention_percentage = Column(Float, nullable=False, default=0.75)  # 0.75% de retención

    # Series y controles
    next_invoice_number = Column(Integer, nullable=False, default=1)
    invoice_series = Column(String(10), nullable=False, default="A")

    # Número de autorización SENIAT (si aplica)
    seniat_authorization_number = Column(String(50), nullable=True)
    seniat_authorization_date = Column(Date, nullable=True)

    # Logo y estilos
    logo_path = Column(String(255), nullable=True)
    invoice_header_color = Column(String(7), nullable=False, default="#1a3a52")  # Color hex

    # Información adicional
    invoice_footer_text = Column(Text, nullable=True)
    payment_terms = Column(Text, nullable=True)

    # Auditoría
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class InvoiceControlNumber(Base):
    """Control de números generados para SENIAT."""
    __tablename__ = "invoice_control_numbers"

    id = Column(Integer, primary_key=True, index=True)

    # Información del control
    control_number = Column(String(20), unique=True, nullable=False, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)

    # Validación
    is_used = Column(Boolean, nullable=False, default=False)
    used_at = Column(DateTime, nullable=True)

    # Auditoría
    generated_at = Column(DateTime, default=datetime.utcnow)
