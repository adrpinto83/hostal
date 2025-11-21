# app/models/stripe_webhook_event.py
"""
Modelo para almacenar eventos de webhook de Stripe.
Permite auditoría, reintento y procesamiento confiable de webhooks.
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum

from sqlalchemy import Column, DateTime, Integer, String, Text, Boolean, JSON, Index
from sqlalchemy import Enum as SAEnum

from ..core.db import Base


class WebhookEventType(str, Enum):
    """Tipos de eventos de Stripe que procesamos."""
    payment_intent_succeeded = "payment_intent.succeeded"
    payment_intent_payment_failed = "payment_intent.payment_failed"
    payment_intent_canceled = "payment_intent.canceled"
    payment_intent_amount_capturable_updated = "payment_intent.amount_capturable_updated"

    charge_succeeded = "charge.succeeded"
    charge_failed = "charge.failed"
    charge_refunded = "charge.refunded"
    charge_captured = "charge.captured"
    charge_dispute_created = "charge.dispute.created"

    customer_created = "customer.created"
    customer_updated = "customer.updated"
    customer_deleted = "customer.deleted"

    payment_method_attached = "payment_method.attached"
    payment_method_detached = "payment_method.detached"


class WebhookProcessingStatus(str, Enum):
    """Estado del procesamiento de webhook."""
    pending = "pending"          # Pendiente de procesar
    processing = "processing"    # En proceso
    success = "success"          # Procesado exitosamente
    failed = "failed"            # Falló el procesamiento
    skipped = "skipped"          # Saltado (duplicado u otro motivo)
    retry = "retry"              # Pendiente de reintento


class StripeWebhookEvent(Base):
    """Almacena eventos de webhook de Stripe para auditoría y reintento."""
    __tablename__ = "stripe_webhook_events"

    id = Column(Integer, primary_key=True, index=True)

    # ID único del evento desde Stripe
    event_id = Column(String(100), unique=True, nullable=False, index=True)

    # Tipo de evento
    event_type = Column(
        SAEnum(WebhookEventType, name="webhook_event_type", create_constraint=True),
        nullable=False,
        index=True
    )

    # Timestamp del evento (desde Stripe)
    event_timestamp = Column(DateTime, nullable=False, index=True)

    # Payload completo del webhook (para auditoría)
    payload = Column(JSON, nullable=False)

    # Información extraída del payload para queries rápidas
    payment_intent_id = Column(String(100), nullable=True, index=True)
    charge_id = Column(String(100), nullable=True, index=True)
    customer_id = Column(String(100), nullable=True, index=True)
    amount = Column(Integer, nullable=True)  # En centavos
    currency = Column(String(3), nullable=True)

    # Estado del procesamiento
    processing_status = Column(
        SAEnum(WebhookProcessingStatus, name="webhook_processing_status", create_constraint=True),
        nullable=False,
        default=WebhookProcessingStatus.pending,
        server_default="pending",
        index=True
    )

    # Detalles del procesamiento
    processed = Column(Boolean, nullable=False, default=False)
    processed_at = Column(DateTime, nullable=True)

    # Información de error (si aplica)
    error_message = Column(Text, nullable=True)
    error_traceback = Column(Text, nullable=True)

    # Reintentos
    retry_count = Column(Integer, nullable=False, default=0)
    last_retry_at = Column(DateTime, nullable=True)
    next_retry_at = Column(DateTime, nullable=True)

    # Auditoría
    received_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Índices para queries frecuentes
    __table_args__ = (
        Index("idx_webhook_event_status_timestamp", processing_status, event_timestamp),
        Index("idx_webhook_event_type_timestamp", event_type, event_timestamp),
        Index("idx_webhook_payment_intent", payment_intent_id),
        Index("idx_webhook_charge", charge_id),
        Index("idx_webhook_retry", processing_status, next_retry_at),
    )

    def __repr__(self):
        return f"<StripeWebhookEvent {self.event_id}: {self.event_type} ({self.processing_status})>"


class StripeWebhookLog(Base):
    """Log adicional de procesamiento de webhooks para debugging."""
    __tablename__ = "stripe_webhook_logs"

    id = Column(Integer, primary_key=True, index=True)

    # Referencia al evento
    webhook_event_id = Column(Integer, nullable=False, index=True)
    event_id = Column(String(100), nullable=False, index=True)

    # Log info
    action = Column(String(100), nullable=False)  # 'received', 'verified', 'processing', 'success', 'error'
    status = Column(String(50), nullable=False)   # 'started', 'completed', 'failed'
    message = Column(Text, nullable=True)

    # Details
    details = Column(JSON, nullable=True)  # Extra info about the action

    # Timing
    duration_ms = Column(Integer, nullable=True)  # Duración en ms
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_webhook_log_event", event_id),
        Index("idx_webhook_log_action", action),
        Index("idx_webhook_log_created", created_at),
    )

    def __repr__(self):
        return f"<StripeWebhookLog {self.event_id}: {self.action} ({self.status})>"
