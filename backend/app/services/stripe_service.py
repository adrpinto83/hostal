# app/services/stripe_service.py
"""
Servicio de integración con Stripe.
Proporciona funcionalidad para procesar pagos, manejar webhooks,
y gestionar intentos de pago.
"""
import os
import json
import hmac
import hashlib
from typing import Optional, Dict, Any, Tuple
from datetime import datetime

from sqlalchemy.orm import Session
import stripe

from ..models import Payment, PaymentStatus, Currency, Invoice, StripeWebhookEvent, WebhookProcessingStatus, FinancialTransaction, TransactionType, TransactionStatus, PaymentGateway
from ..services.payment_gateway import PaymentResult


class StripeService:
    """Servicio para procesamiento de pagos con Stripe."""

    def __init__(self, db: Session):
        self.db = db
        self.stripe_api_key = os.getenv("STRIPE_SECRET_KEY")
        self.webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

        if self.stripe_api_key:
            stripe.api_key = self.stripe_api_key

    async def create_payment_intent(
        self,
        amount: float,
        currency: str,
        guest_id: int,
        description: str = "",
        invoice_id: Optional[int] = None,
        reservation_id: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None,
        user_id: Optional[int] = None,
    ) -> PaymentResult:
        """
        Crea un PaymentIntent en Stripe.

        Args:
            amount: Monto en la moneda especificada
            currency: Moneda (usd, ves, eur)
            guest_id: ID del huésped
            description: Descripción del pago
            invoice_id: ID de la factura (opcional)
            reservation_id: ID de la reserva (opcional)
            metadata: Metadata adicional para Stripe
            user_id: ID del usuario que crea el pago

        Returns:
            PaymentResult con el intent creado
        """
        try:
            if not self.stripe_api_key:
                return PaymentResult(
                    success=False,
                    message="Stripe API key no configurado"
                )

            # Convertir moneda a formato Stripe (lowercase)
            stripe_currency = currency.lower()

            # Preparar metadata
            intent_metadata = {
                "guest_id": str(guest_id),
                "invoice_id": str(invoice_id) if invoice_id else "",
                "reservation_id": str(reservation_id) if reservation_id else "",
                "system": "hostal_management",
            }
            if metadata:
                intent_metadata.update(metadata)

            # Crear PaymentIntent
            intent = stripe.PaymentIntent.create(
                amount=int(amount * 100),  # Stripe espera centavos
                currency=stripe_currency,
                description=description,
                metadata=intent_metadata,
                automatic_payment_methods={"enabled": True},
            )

            # Crear registro de pago
            payment = Payment(
                guest_id=guest_id,
                reservation_id=reservation_id,
                amount=amount,
                currency=Currency.USD if stripe_currency == "usd" else Currency.EUR if stripe_currency == "eur" else Currency.VES,
                method="stripe",
                status=PaymentStatus.pending,
                reference_number=intent.id,
                stripe_payment_intent_id=intent.id,
                stripe_status=intent.status,
                stripe_metadata=intent_metadata,
                notes=f"Stripe PaymentIntent creado\nDescripción: {description}",
                created_by=user_id,
            )

            self.db.add(payment)
            self.db.flush()

            # Registrar en transacciones financieras
            financial_tx = FinancialTransaction(
                transaction_type=TransactionType.payment,
                status=TransactionStatus.pending,
                payment_id=payment.id,
                invoice_id=invoice_id,
                guest_id=guest_id,
                amount=amount,
                currency=stripe_currency,
                gateway=PaymentGateway.stripe,
                gateway_transaction_id=intent.id,
                description=f"Stripe PaymentIntent: {description}",
            )

            self.db.add(financial_tx)
            self.db.commit()

            return PaymentResult(
                success=True,
                payment_id=payment.id,
                gateway_transaction_id=intent.id,
                message=f"PaymentIntent creado: {intent.id}",
                data={
                    "client_secret": intent.client_secret,
                    "payment_intent_id": intent.id,
                    "amount": amount,
                    "currency": stripe_currency,
                    "status": intent.status,
                }
            )

        except stripe.error.CardError as e:
            return PaymentResult(
                success=False,
                message=f"Error de tarjeta: {e.user_message}",
                errors={"card": e.user_message}
            )
        except stripe.error.RateLimitError:
            return PaymentResult(
                success=False,
                message="Límite de tasa alcanzado. Intente más tarde."
            )
        except stripe.error.InvalidRequestError as e:
            return PaymentResult(
                success=False,
                message=f"Solicitud inválida a Stripe: {str(e)}",
                errors={"stripe": str(e)}
            )
        except stripe.error.AuthenticationError:
            return PaymentResult(
                success=False,
                message="Error de autenticación con Stripe"
            )
        except stripe.error.APIConnectionError:
            return PaymentResult(
                success=False,
                message="Error de conexión con Stripe"
            )
        except stripe.error.StripeError as e:
            return PaymentResult(
                success=False,
                message=f"Error de Stripe: {str(e)}",
                errors={"stripe": str(e)}
            )
        except Exception as e:
            self.db.rollback()
            return PaymentResult(
                success=False,
                message=f"Error al crear PaymentIntent: {str(e)}",
                errors={"database": str(e)}
            )

    async def process_webhook(
        self,
        payload: bytes,
        signature: str,
    ) -> PaymentResult:
        """
        Procesa un webhook de Stripe.

        Args:
            payload: Payload del webhook (bytes)
            signature: Firma del webhook de Stripe

        Returns:
            PaymentResult indicando si el webhook fue procesado
        """
        try:
            if not self.webhook_secret:
                return PaymentResult(
                    success=False,
                    message="Webhook secret no configurado"
                )

            # Verificar firma
            is_valid = self._verify_webhook_signature(payload, signature)
            if not is_valid:
                return PaymentResult(
                    success=False,
                    message="Firma de webhook inválida"
                )

            # Parsear evento
            event = json.loads(payload)
            event_id = event.get("id")
            event_type = event.get("type")

            # Verificar si ya fue procesado
            existing_event = self.db.query(StripeWebhookEvent).filter(
                StripeWebhookEvent.event_id == event_id
            ).first()

            if existing_event and existing_event.processed:
                return PaymentResult(
                    success=True,
                    message=f"Webhook {event_id} ya fue procesado"
                )

            # Crear o actualizar registro del evento
            webhook_event = existing_event or StripeWebhookEvent(
                event_id=event_id,
                event_type=event_type,
                event_timestamp=datetime.fromtimestamp(event.get("created", 0)),
                payload=event,
            )

            # Procesar según tipo de evento
            if event_type == "payment_intent.succeeded":
                result = await self._handle_payment_succeeded(event)
            elif event_type == "payment_intent.payment_failed":
                result = await self._handle_payment_failed(event)
            elif event_type == "charge.refunded":
                result = await self._handle_charge_refunded(event)
            else:
                result = PaymentResult(
                    success=True,
                    message=f"Evento {event_type} recibido pero no procesado"
                )

            # Actualizar estado del evento
            webhook_event.processing_status = WebhookProcessingStatus.processed if result.success else WebhookProcessingStatus.failed
            webhook_event.processed = result.success
            webhook_event.processed_at = datetime.utcnow()

            if not result.success:
                webhook_event.error_message = result.message

            self.db.add(webhook_event)
            self.db.commit()

            return result

        except Exception as e:
            self.db.rollback()
            return PaymentResult(
                success=False,
                message=f"Error procesando webhook: {str(e)}",
                errors={"webhook": str(e)}
            )

    async def refund_payment(
        self,
        payment_id: int,
        amount: Optional[float] = None,
        reason: str = "requested_by_customer",
        user_id: Optional[int] = None,
    ) -> PaymentResult:
        """
        Procesa un reembolso en Stripe.

        Args:
            payment_id: ID del pago a reembolsar
            amount: Monto a reembolsar (None = total)
            reason: Razón del reembolso
            user_id: ID del usuario autorizador

        Returns:
            PaymentResult del reembolso
        """
        try:
            if not self.stripe_api_key:
                return PaymentResult(
                    success=False,
                    message="Stripe API key no configurado"
                )

            # Obtener el pago
            payment = self.db.query(Payment).filter(Payment.id == payment_id).first()
            if not payment:
                return PaymentResult(success=False, message="Pago no encontrado")

            if not payment.stripe_charge_id:
                return PaymentResult(
                    success=False,
                    message="Este pago no tiene una carga de Stripe asociada"
                )

            refund_amount = amount or payment.amount

            if refund_amount > payment.amount:
                return PaymentResult(
                    success=False,
                    message=f"Monto de reembolso ({refund_amount}) no puede ser mayor que el pago ({payment.amount})"
                )

            # Crear reembolso en Stripe
            refund = stripe.Refund.create(
                charge=payment.stripe_charge_id,
                amount=int(refund_amount * 100) if amount else None,
                reason=reason,
                metadata={
                    "payment_id": str(payment_id),
                    "system": "hostal_management",
                    "authorized_by": str(user_id) if user_id else "system",
                }
            )

            # Actualizar estado del pago
            if refund_amount == payment.amount:
                payment.status = PaymentStatus.refunded
            else:
                payment.status = PaymentStatus.partially_refunded

            payment.notes = f"{payment.notes}\n\nREEMBOLSO STRIPE: {refund_amount} {payment.currency.value}\nRazón: {reason}\nRefund ID: {refund.id}"
            payment.updated_at = datetime.utcnow()

            # Registrar transacción
            financial_tx = FinancialTransaction(
                transaction_type=TransactionType.refund,
                status=TransactionStatus.completed,
                payment_id=payment_id,
                guest_id=payment.guest_id,
                amount=refund_amount,
                currency=payment.currency.value,
                gateway=PaymentGateway.stripe,
                gateway_transaction_id=refund.id,
                description=f"Stripe Refund: {reason}",
            )

            self.db.add(payment)
            self.db.add(financial_tx)
            self.db.commit()

            return PaymentResult(
                success=True,
                payment_id=payment_id,
                gateway_transaction_id=refund.id,
                message=f"Reembolso de {refund_amount} {payment.currency.value} procesado",
                data={
                    "refund_id": refund.id,
                    "amount": refund_amount,
                    "currency": payment.currency.value,
                    "status": refund.status,
                }
            )

        except stripe.error.InvalidRequestError as e:
            self.db.rollback()
            return PaymentResult(
                success=False,
                message=f"Error de solicitud: {str(e)}",
            )
        except stripe.error.StripeError as e:
            self.db.rollback()
            return PaymentResult(
                success=False,
                message=f"Error de Stripe: {str(e)}",
            )
        except Exception as e:
            self.db.rollback()
            return PaymentResult(
                success=False,
                message=f"Error procesando reembolso: {str(e)}",
            )

    async def get_payment_intent(
        self,
        payment_intent_id: str,
    ) -> PaymentResult:
        """
        Obtiene estado actual de un PaymentIntent desde Stripe.

        Args:
            payment_intent_id: ID del PaymentIntent

        Returns:
            PaymentResult con detalles del intent
        """
        try:
            if not self.stripe_api_key:
                return PaymentResult(
                    success=False,
                    message="Stripe API key no configurado"
                )

            intent = stripe.PaymentIntent.retrieve(payment_intent_id)

            return PaymentResult(
                success=True,
                message="PaymentIntent obtenido",
                data={
                    "id": intent.id,
                    "amount": intent.amount / 100,
                    "currency": intent.currency,
                    "status": intent.status,
                    "client_secret": intent.client_secret,
                    "charges": [
                        {
                            "id": charge.id,
                            "status": charge.status,
                            "amount": charge.amount / 100,
                        }
                        for charge in intent.charges.data
                    ],
                }
            )

        except stripe.error.InvalidRequestError:
            return PaymentResult(
                success=False,
                message="PaymentIntent no encontrado"
            )
        except stripe.error.StripeError as e:
            return PaymentResult(
                success=False,
                message=f"Error de Stripe: {str(e)}"
            )

    def _verify_webhook_signature(
        self,
        payload: bytes,
        signature: str,
    ) -> bool:
        """
        Verifica la firma de un webhook de Stripe.

        Args:
            payload: Payload del webhook
            signature: Firma del header

        Returns:
            True si la firma es válida
        """
        if not self.webhook_secret:
            return False

        try:
            computed_signature = hmac.new(
                self.webhook_secret.encode(),
                payload,
                hashlib.sha256
            ).hexdigest()

            return hmac.compare_digest(computed_signature, signature)
        except Exception:
            return False

    async def _handle_payment_succeeded(self, event: Dict[str, Any]) -> PaymentResult:
        """
        Maneja evento payment_intent.succeeded de Stripe.

        Args:
            event: Evento de Stripe

        Returns:
            PaymentResult indicando si fue procesado
        """
        try:
            intent = event.get("data", {}).get("object", {})
            payment_intent_id = intent.get("id")
            charge_id = intent.get("charges", {}).get("data", [{}])[0].get("id")

            # Buscar el pago
            payment = self.db.query(Payment).filter(
                Payment.stripe_payment_intent_id == payment_intent_id
            ).first()

            if not payment:
                return PaymentResult(
                    success=False,
                    message="Pago no encontrado para el PaymentIntent"
                )

            # Actualizar estado
            payment.status = PaymentStatus.completed
            payment.stripe_status = intent.get("status")
            payment.stripe_charge_id = charge_id
            payment.payment_date = datetime.utcnow()
            payment.notes = f"{payment.notes}\n\nConfirmado por webhook de Stripe\nCharge ID: {charge_id}"

            # Si hay factura, actualizar su estado
            if payment.invoice_id:
                invoice = self.db.query(Invoice).filter(
                    Invoice.id == payment.invoice_id
                ).first()
                if invoice:
                    invoice.paid_amount = (invoice.paid_amount or 0) + payment.amount
                    invoice.remaining_balance = invoice.total - invoice.paid_amount

                    if invoice.remaining_balance <= 0:
                        invoice.status = "paid"
                        invoice.paid_date = datetime.utcnow()
                    else:
                        invoice.status = "partially_paid"

                    self.db.add(invoice)

            self.db.add(payment)
            self.db.commit()

            return PaymentResult(
                success=True,
                payment_id=payment.id,
                message="Pago confirmado por Stripe"
            )

        except Exception as e:
            self.db.rollback()
            return PaymentResult(
                success=False,
                message=f"Error procesando pago completado: {str(e)}"
            )

    async def _handle_payment_failed(self, event: Dict[str, Any]) -> PaymentResult:
        """
        Maneja evento payment_intent.payment_failed de Stripe.

        Args:
            event: Evento de Stripe

        Returns:
            PaymentResult indicando si fue procesado
        """
        try:
            intent = event.get("data", {}).get("object", {})
            payment_intent_id = intent.get("id")
            last_payment_error = intent.get("last_payment_error", {})

            # Buscar el pago
            payment = self.db.query(Payment).filter(
                Payment.stripe_payment_intent_id == payment_intent_id
            ).first()

            if not payment:
                return PaymentResult(
                    success=False,
                    message="Pago no encontrado para el PaymentIntent"
                )

            # Actualizar estado
            payment.status = PaymentStatus.failed
            payment.stripe_status = intent.get("status")
            payment.stripe_error_code = last_payment_error.get("code")
            payment.stripe_error_message = last_payment_error.get("message")
            payment.stripe_attempt_count = (payment.stripe_attempt_count or 0) + 1
            payment.stripe_last_error_at = datetime.utcnow()

            error_msg = last_payment_error.get("message", "Error desconocido")
            payment.notes = f"{payment.notes}\n\nPago fallido: {error_msg}"

            self.db.add(payment)
            self.db.commit()

            return PaymentResult(
                success=True,
                payment_id=payment.id,
                message=f"Pago fallido: {error_msg}"
            )

        except Exception as e:
            self.db.rollback()
            return PaymentResult(
                success=False,
                message=f"Error procesando pago fallido: {str(e)}"
            )

    async def _handle_charge_refunded(self, event: Dict[str, Any]) -> PaymentResult:
        """
        Maneja evento charge.refunded de Stripe.

        Args:
            event: Evento de Stripe

        Returns:
            PaymentResult indicando si fue procesado
        """
        try:
            charge = event.get("data", {}).get("object", {})
            charge_id = charge.get("id")
            refund_amount = charge.get("amount_refunded", 0) / 100

            # Buscar el pago
            payment = self.db.query(Payment).filter(
                Payment.stripe_charge_id == charge_id
            ).first()

            if not payment:
                return PaymentResult(
                    success=False,
                    message="Pago no encontrado para la carga"
                )

            # Actualizar estado
            if refund_amount == payment.amount:
                payment.status = PaymentStatus.refunded
            else:
                payment.status = PaymentStatus.partially_refunded

            payment.notes = f"{payment.notes}\n\nReembolso procesado por Stripe: {refund_amount} {payment.currency.value}"

            self.db.add(payment)
            self.db.commit()

            return PaymentResult(
                success=True,
                payment_id=payment.id,
                message=f"Reembolso de {refund_amount} {payment.currency.value} procesado"
            )

        except Exception as e:
            self.db.rollback()
            return PaymentResult(
                success=False,
                message=f"Error procesando reembolso: {str(e)}"
            )
