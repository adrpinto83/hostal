# app/services/payment_gateway.py
"""
Servicio unificado de pasarelas de pago.
Proporciona una interfaz común para múltiples proveedores de pago.
"""
from typing import Optional, Dict, Any, Tuple
from datetime import datetime
from enum import Enum

from sqlalchemy.orm import Session
from sqlalchemy import func

from ..models import Payment, PaymentStatus, Currency, Invoice
from ..services.payment_validators import (
    VenezuelanMobilePaymentValidator,
    PaymentValidator,
)


class PaymentGatewayType(str, Enum):
    """Tipos de pasarelas de pago soportadas."""
    STRIPE = "stripe"
    PAYPAL = "paypal"
    MANUAL = "manual"
    MOBILE_PAYMENT_VENEZUELA = "mobile_payment_venezuela"


class PaymentResult:
    """Resultado de una operación de pago."""

    def __init__(
        self,
        success: bool,
        payment_id: Optional[int] = None,
        gateway_transaction_id: Optional[str] = None,
        message: str = "",
        errors: Optional[Dict[str, str]] = None,
        data: Optional[Dict[str, Any]] = None,
    ):
        self.success = success
        self.payment_id = payment_id
        self.gateway_transaction_id = gateway_transaction_id
        self.message = message
        self.errors = errors or {}
        self.data = data or {}

    def to_dict(self) -> dict:
        """Convierte resultado a diccionario."""
        return {
            "success": self.success,
            "payment_id": self.payment_id,
            "gateway_transaction_id": self.gateway_transaction_id,
            "message": self.message,
            "errors": self.errors,
            "data": self.data,
        }


class PaymentGatewayService:
    """Servicio unificado de pasarelas de pago."""

    def __init__(self, db: Session):
        self.db = db

    async def process_mobile_payment_venezuela(
        self,
        guest_id: int,
        amount: float,
        currency: str,
        phone_number: str,
        cedula: str,
        bank_code: str,
        transaction_reference: str,
        description: str = "",
        invoice_id: Optional[int] = None,
        reservation_id: Optional[int] = None,
        user_id: Optional[int] = None,
    ) -> PaymentResult:
        """
        Procesa un pago por Banco Móvil de Venezuela.

        Args:
            guest_id: ID del huésped
            amount: Monto del pago
            currency: Moneda (VES, USD, EUR)
            phone_number: Número telefónico del pagador
            cedula: Cédula de identidad
            bank_code: Código del banco
            transaction_reference: Referencia de transacción del banco
            description: Descripción del pago
            invoice_id: ID de la factura (opcional)
            reservation_id: ID de la reserva (opcional)
            user_id: ID del usuario que registra el pago

        Returns:
            PaymentResult con el resultado de la operación
        """
        # Validar monto
        is_valid, error = PaymentValidator.validate_amount(amount)
        if not is_valid:
            return PaymentResult(success=False, message=error)

        # Validar moneda
        is_valid, error = PaymentValidator.validate_currency(currency)
        if not is_valid:
            return PaymentResult(success=False, message=error)

        # Validar datos de pago móvil Venezuelan
        is_valid, validation_result = VenezuelanMobilePaymentValidator.validate_mobile_payment_request(
            phone_number=phone_number,
            cedula=cedula,
            bank_code=bank_code,
            transaction_reference=transaction_reference,
            amount=amount,
            description=description,
        )

        if not is_valid:
            return PaymentResult(
                success=False,
                message="Error en validación de pago móvil",
                errors=validation_result,
            )

        # Si todo es válido, crear registro de pago
        try:
            # Datos validados y normalizados
            validated_data = validation_result

            # Crear registro de pago
            payment = Payment(
                guest_id=guest_id,
                reservation_id=reservation_id,
                amount=amount,
                currency=Currency.VES if currency == "VES" else Currency.USD,
                amount_ves=amount if currency == "VES" else amount,  # Simplificado
                method="mobile_payment",
                status=PaymentStatus.completed,  # Para pagos móviles manuales, asumimos completado
                reference_number=validated_data["transaction_reference"],
                notes=f"Banco Móvil - {validated_data['bank_name']}\n"
                      f"Operador: {validated_data['mobile_operator']}\n"
                      f"Teléfono: {validated_data['phone_number']}\n"
                      f"Cédula: {validated_data['cedula']}\n"
                      f"Descripción: {validated_data['description'] or 'N/A'}",
                payment_date=datetime.utcnow(),
                created_by=user_id,
            )

            self.db.add(payment)
            self.db.flush()  # Para obtener el ID antes de commit

            # Si existe factura, actualizar su estado
            if invoice_id:
                invoice = self.db.query(Invoice).filter(Invoice.id == invoice_id).first()
                if invoice:
                    invoice.paid_amount += amount
                    invoice.remaining_balance = invoice.total - invoice.paid_amount

                    if invoice.remaining_balance <= 0:
                        invoice.status = "paid"
                        invoice.paid_date = datetime.utcnow()
                    else:
                        invoice.status = "partially_paid"

                    self.db.add(invoice)

            self.db.commit()

            return PaymentResult(
                success=True,
                payment_id=payment.id,
                gateway_transaction_id=validated_data["transaction_reference"],
                message=f"Pago registrado exitosamente. Referencia: {validated_data['transaction_reference']}",
                data={
                    "phone_number": validated_data["phone_number"],
                    "bank_name": validated_data["bank_name"],
                    "mobile_operator": validated_data["mobile_operator"],
                    "amount": amount,
                    "currency": currency,
                },
            )

        except Exception as e:
            self.db.rollback()
            return PaymentResult(
                success=False,
                message=f"Error al registrar pago: {str(e)}",
                errors={"database": str(e)},
            )

    async def refund_payment(
        self,
        payment_id: int,
        amount: Optional[float] = None,
        reason: str = "",
        user_id: Optional[int] = None,
    ) -> PaymentResult:
        """
        Procesa un reembolso de pago.

        Args:
            payment_id: ID del pago a reembolsar
            amount: Monto a reembolsar (None = reembolso total)
            reason: Razón del reembolso
            user_id: ID del usuario que autoriza

        Returns:
            PaymentResult
        """
        try:
            payment = self.db.query(Payment).filter(Payment.id == payment_id).first()
            if not payment:
                return PaymentResult(success=False, message="Pago no encontrado")

            refund_amount = amount or payment.amount

            if refund_amount > payment.amount:
                return PaymentResult(
                    success=False,
                    message=f"Monto de reembolso ({refund_amount}) no puede ser mayor que el pago original ({payment.amount})"
                )

            # Actualizar estado
            if refund_amount == payment.amount:
                payment.status = PaymentStatus.refunded
            else:
                # Parcial - crear nuevo pago negativo
                pass  # Implementar lógica de reembolso parcial

            payment.notes = f"{payment.notes}\n\nREEMBOLSO: {refund_amount} {payment.currency} - Razón: {reason}"
            payment.updated_at = datetime.utcnow()

            self.db.add(payment)
            self.db.commit()

            return PaymentResult(
                success=True,
                payment_id=payment.id,
                message=f"Reembolso de {refund_amount} {payment.currency} procesado",
            )

        except Exception as e:
            self.db.rollback()
            return PaymentResult(
                success=False,
                message=f"Error al procesar reembolso: {str(e)}",
            )

    async def get_payment(self, payment_id: int) -> Optional[Dict[str, Any]]:
        """Obtiene información de un pago."""
        payment = self.db.query(Payment).filter(Payment.id == payment_id).first()
        if not payment:
            return None

        return {
            "id": payment.id,
            "guest_id": payment.guest_id,
            "amount": payment.amount,
            "currency": payment.currency.value,
            "method": payment.method.value,
            "status": payment.status.value,
            "reference_number": payment.reference_number,
            "payment_date": payment.payment_date.isoformat() if payment.payment_date else None,
            "notes": payment.notes,
        }

    async def get_guest_payments(self, guest_id: int, limit: int = 50, offset: int = 0) -> Dict[str, Any]:
        """
        Obtiene historial de pagos de un huésped.

        Args:
            guest_id: ID del huésped
            limit: Límite de registros
            offset: Offset para paginación

        Returns:
            Dict con pagos y totales
        """
        query = self.db.query(Payment).filter(Payment.guest_id == guest_id).order_by(
            Payment.payment_date.desc()
        )

        total = query.count()
        payments = query.limit(limit).offset(offset).all()

        # Calcular totales
        total_by_status = {}
        for status in PaymentStatus:
            count_query = self.db.query(func.sum(Payment.amount)).filter(
                Payment.guest_id == guest_id,
                Payment.status == status,
            )
            total_by_status[status.value] = count_query.scalar() or 0

        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "payments": [
                {
                    "id": p.id,
                    "amount": p.amount,
                    "currency": p.currency.value,
                    "method": p.method.value,
                    "status": p.status.value,
                    "payment_date": p.payment_date.isoformat(),
                }
                for p in payments
            ],
            "summary": total_by_status,
        }

    async def get_mobile_payment_info(self) -> Dict[str, Any]:
        """
        Retorna información útil para pagos móviles de Venezuela.

        Returns:
            Dict con bancos, operadores, etc.
        """
        return {
            "banks": VenezuelanMobilePaymentValidator.get_valid_banks_list(),
            "mobile_operators": VenezuelanMobilePaymentValidator.get_valid_mobile_operators(),
            "instructions": {
                "es": "Realice una transferencia por Banco Móvil usando el código del banco. "
                      "Proporcione el teléfono registrado, su cédula, el banco utilizado y la referencia de la transacción.",
                "en": "Make a transfer via Mobile Banking using the bank code. "
                      "Provide your registered phone number, ID number, the bank used, and the transaction reference.",
            },
        }
