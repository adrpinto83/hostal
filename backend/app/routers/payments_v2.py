# app/routers/payments_v2.py
"""
Routers mejorados para sistema de pagos con soporte para:
- Stripe
- PayPal
- Pagos Móviles (Venezuela)
- Pagos manuales
"""
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..core.security import get_current_user
from ..core.audit import log_action
from ..models import User, Payment, Invoice
from ..schemas.payment import PaymentCreate, PaymentOut, PaymentUpdate
from ..services.payment_gateway import PaymentGatewayService, PaymentGatewayType
from ..services.stripe_service import StripeService
from ..services.payment_validators import (
    VenezuelanMobilePaymentValidator,
    PaymentValidator,
)

router = APIRouter(prefix="/api/v1/payments-v2", tags=["payments-v2"])


@router.post("/mobile-venezuela", response_model=dict)
async def create_mobile_payment_venezuela(
    guest_id: int,
    amount: float,
    currency: str = "VES",
    phone_number: str = None,
    cedula: str = None,
    bank_code: str = None,
    transaction_reference: str = None,
    description: str = None,
    invoice_id: Optional[int] = None,
    reservation_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Crear pago por Banco Móvil de Venezuela.

    Esta ruta procesa pagos usando el sistema Banco Móvil venezolano.
    Realiza validaciones exhaustivas de:
    - Números telefónicos (formatos +58 y 0XXX)
    - Cédulas de identidad (V, E, J, G, P)
    - Códigos de banco válidos
    - Referencias de transacción

    **Validación de Teléfono:**
    - Formatos válidos: +58-414-1234567, 0414-1234567, 04141234567
    - Operadores: Movistar (0414, 0424), Digitel (0412, 0416, 0426), ANDES (0410, 0430, 0440)

    **Validación de Cédula:**
    - Formatos válidos: V-12.345.678, V12345678, E-12.345.678
    - Tipos: V (Venezolana), E (Extranjería), J (Jurídica), G (Gubernamental), P (Pasaporte)

    **Validación de Banco:**
    - Código de 4 dígitos (ej: 0102 para Banco de Venezuela)
    - Consulte /payments-v2/mobile-venezuela/info para lista completa

    **Validación de Referencia:**
    - 6-20 caracteres alfanuméricos
    - Ejemplo: 123456 o ABC12345

    **Ejemplo de solicitud:**
    ```json
    {
        "guest_id": 1,
        "amount": 100000,
        "currency": "VES",
        "phone_number": "0414-1234567",
        "cedula": "V-12.345.678",
        "bank_code": "0102",
        "transaction_reference": "123456",
        "description": "Pago de reserva",
        "invoice_id": 1
    }
    ```
    """
    # Validar permisos
    if current_user.role not in ["admin", "recepcionista"]:
        raise HTTPException(status_code=403, detail="Permiso denegado")

    # Crear servicio de pagos
    payment_service = PaymentGatewayService(db)

    # Procesar pago
    result = await payment_service.process_mobile_payment_venezuela(
        guest_id=guest_id,
        amount=amount,
        currency=currency,
        phone_number=phone_number,
        cedula=cedula,
        bank_code=bank_code,
        transaction_reference=transaction_reference,
        description=description,
        invoice_id=invoice_id,
        reservation_id=reservation_id,
        user_id=current_user.id,
    )

    # Auditar
    log_action(
        db,
        user_id=current_user.id,
        entity="payment",
        entity_id=result.payment_id,
        action="create_mobile_payment",
        details={
            "guest_id": guest_id,
            "amount": amount,
            "currency": currency,
            "bank_code": bank_code,
            "success": result.success,
        },
    )

    if not result.success:
        raise HTTPException(status_code=400, detail=result.to_dict())

    return result.to_dict()


@router.get("/mobile-venezuela/info")
async def get_mobile_payment_info():
    """
    Obtiene información útil para procesar pagos móviles de Venezuela.

    Retorna:
    - Lista de bancos válidos con códigos
    - Operadores móviles con códigos de área
    - Instrucciones de pago

    **Código de bancos más populares:**
    - 0102: Banco de Venezuela
    - 0104: Banesco
    - 0108: Banco Provincial
    - 0134: Banco de Crédito e Inversiones

    **Operadores móviles:**
    - 0414, 0424: Movistar
    - 0412, 0416, 0426: Digitel
    - 0410, 0430, 0440: ANDES
    """
    payment_service = PaymentGatewayService(None)
    return await payment_service.get_mobile_payment_info()


@router.post("/validate/phone")
async def validate_phone_number(phone_number: str):
    """
    Valida un número telefónico venezolano.

    Soporta formatos:
    - +58-414-1234567
    - 0414-1234567
    - 04141234567

    Retorna información del operador móvil detectado.
    """
    is_valid, error = VenezuelanMobilePaymentValidator.validate_phone_number(phone_number)

    if not is_valid:
        raise HTTPException(status_code=400, detail={"error": error})

    # Extraer operador
    import re

    digits = re.sub(r'[^\d]', '', phone_number)
    if digits.startswith('58'):
        digits = digits[2:]

    operator_code = digits[:4]
    operators = VenezuelanMobilePaymentValidator.get_valid_mobile_operators()
    operator = operators.get(operator_code, "Desconocido")

    return {
        "valid": True,
        "phone_number": VenezuelanMobilePaymentValidator._normalize_phone(phone_number),
        "operator": operator,
        "operator_code": operator_code,
    }


@router.post("/validate/cedula")
async def validate_cedula_number(cedula: str):
    """
    Valida un número de cédula venezolana.

    Formatos soportados:
    - V-12.345.678
    - V12345678
    - E-12.345.678
    - J-12.345.678

    Tipos:
    - V: Cédula Venezolana
    - E: Extranjería
    - J: Jurídica
    - G: Gubernamental
    - P: Pasaporte
    """
    is_valid, error = VenezuelanMobilePaymentValidator.validate_cedula(cedula)

    if not is_valid:
        raise HTTPException(status_code=400, detail={"error": error})

    return {
        "valid": True,
        "cedula": VenezuelanMobilePaymentValidator._normalize_cedula(cedula),
    }


@router.post("/validate/bank-code")
async def validate_bank_code(bank_code: str):
    """
    Valida un código de banco venezolano.

    El código debe ser de 4 dígitos.
    Ejemplo: 0102 (Banco de Venezuela)
    """
    is_valid, error = VenezuelanMobilePaymentValidator.validate_bank_code(bank_code)

    if not is_valid:
        raise HTTPException(status_code=400, detail={"error": error})

    return {
        "valid": True,
        "bank_code": bank_code.strip(),
    }


@router.post("/validate/transaction-ref")
async def validate_transaction_reference(reference: str):
    """
    Valida una referencia de transacción de Banco Móvil.

    - Longitud: 6-20 caracteres
    - Caracteres permitidos: Alfanuméricos (A-Z, 0-9)
    - Ejemplo válido: 123456 o ABC12345
    """
    is_valid, error = VenezuelanMobilePaymentValidator.validate_transaction_reference(reference)

    if not is_valid:
        raise HTTPException(status_code=400, detail={"error": error})

    return {
        "valid": True,
        "transaction_reference": reference.strip().upper(),
    }


@router.get("/mobile-venezuela/banks")
async def get_banks_list():
    """
    Obtiene lista completa de bancos válidos para Banco Móvil de Venezuela.

    Cada banco tiene:
    - code: Código numérico de 4 dígitos
    - name: Nombre del banco en inglés
    - name_es: Nombre del banco en español

    Esta información se puede usar para mostrar un dropdown en el frontend.
    """
    return {
        "banks": VenezuelanMobilePaymentValidator.get_valid_banks_list(),
        "total": len(VenezuelanMobilePaymentValidator.get_valid_banks_list()),
    }


@router.get("/mobile-venezuela/operators")
async def get_mobile_operators():
    """
    Obtiene lista de operadores móviles en Venezuela.

    Estructura: { "código_de_área": "nombre_del_operador" }

    Ejemplo:
    - "0414": "Movistar"
    - "0412": "Digitel"
    - "0410": "ANDES"
    """
    return VenezuelanMobilePaymentValidator.get_valid_mobile_operators()


@router.get("/{payment_id}")
async def get_payment(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Obtiene información detallada de un pago.

    Solo el creador del pago, administradores o el huésped pueden verlo.
    """
    payment = db.query(Payment).filter(Payment.id == payment_id).first()

    if not payment:
        raise HTTPException(status_code=404, detail="Pago no encontrado")

    # Validar permisos
    if (
        current_user.role not in ["admin"]
        and payment.guest_id != current_user.id
        and payment.created_by != current_user.id
    ):
        raise HTTPException(status_code=403, detail="Permiso denegado")

    return {
        "id": payment.id,
        "guest_id": payment.guest_id,
        "amount": payment.amount,
        "currency": payment.currency.value,
        "method": payment.method.value,
        "status": payment.status.value,
        "reference_number": payment.reference_number,
        "payment_date": payment.payment_date.isoformat(),
        "notes": payment.notes,
    }


@router.get("/guest/{guest_id}")
async def get_guest_payments(
    guest_id: int,
    limit: int = Query(50, le=100),
    offset: int = Query(0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Obtiene historial de pagos de un huésped.

    Incluye resumen de pagos por estado.
    """
    # Validar permisos
    if current_user.role not in ["admin", "recepcionista"]:
        raise HTTPException(status_code=403, detail="Permiso denegado")

    payment_service = PaymentGatewayService(db)
    return await payment_service.get_guest_payments(guest_id, limit, offset)


@router.post("/{payment_id}/refund")
async def refund_payment(
    payment_id: int,
    amount: Optional[float] = None,
    reason: str = "",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Procesa un reembolso de pago.

    Si no especifica monto, reembolsa el monto total.
    """
    # Validar permisos
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores pueden procesar reembolsos")

    payment_service = PaymentGatewayService(db)
    result = await payment_service.refund_payment(payment_id, amount, reason, current_user.id)

    # Auditar
    log_action(
        db,
        user_id=current_user.id,
        entity="payment",
        entity_id=payment_id,
        action="refund_payment",
        details={"amount": amount, "reason": reason, "success": result.success},
    )

    if not result.success:
        raise HTTPException(status_code=400, detail=result.to_dict())

    return result.to_dict()


@router.post("/stripe/create-intent", response_model=dict)
async def create_stripe_payment_intent(
    guest_id: int,
    amount: float,
    currency: str = "usd",
    description: str = None,
    invoice_id: Optional[int] = None,
    reservation_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Crea un PaymentIntent de Stripe para procesar pagos con tarjeta.

    Este endpoint es el primer paso para procesar un pago con Stripe.
    Retorna un `client_secret` que se usa en el frontend con Stripe.js.

    **Monedas soportadas:**
    - usd: Dólar estadounidense
    - eur: Euro
    - ves: Bolívar venezolano (si Stripe lo soporta en tu región)

    **Flujo típico:**
    1. Frontend llama este endpoint para obtener `client_secret`
    2. Frontend usa Stripe.js para confirmar el pago del cliente
    3. Stripe envía webhook a /api/v1/webhooks/stripe cuando el pago se completa
    4. El pago se marca como completado automáticamente

    **Ejemplo de respuesta exitosa:**
    ```json
    {
        "success": true,
        "payment_id": 123,
        "data": {
            "client_secret": "pi_1234567890_secret_abcdef",
            "payment_intent_id": "pi_1234567890",
            "amount": 100.00,
            "currency": "usd"
        }
    }
    ```
    """
    # Validar permisos
    if current_user.role not in ["admin", "recepcionista"]:
        raise HTTPException(status_code=403, detail="Permiso denegado")

    # Crear servicio de Stripe
    stripe_service = StripeService(db)

    # Crear PaymentIntent
    result = await stripe_service.create_payment_intent(
        amount=amount,
        currency=currency,
        guest_id=guest_id,
        description=description or f"Pago de huésped {guest_id}",
        invoice_id=invoice_id,
        reservation_id=reservation_id,
        user_id=current_user.id,
    )

    # Auditar
    log_action(
        db,
        user_id=current_user.id,
        entity="payment",
        entity_id=result.payment_id,
        action="create_stripe_intent",
        details={
            "guest_id": guest_id,
            "amount": amount,
            "currency": currency,
            "success": result.success,
        },
    )

    if not result.success:
        raise HTTPException(status_code=400, detail=result.to_dict())

    return result.to_dict()


@router.get("/stripe/{payment_intent_id}/status", response_model=dict)
async def get_stripe_payment_status(
    payment_intent_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Obtiene el estado actual de un PaymentIntent de Stripe.

    Permite verificar el estado de un pago sin esperar el webhook.
    Útil para polling en el frontend.

    **Estados posibles:**
    - `succeeded`: Pago completado
    - `processing`: Pago en procesamiento
    - `requires_payment_method`: Requiere método de pago
    - `requires_confirmation`: Requiere confirmación
    - `canceled`: Pago cancelado
    """
    # Validar permisos
    if current_user.role not in ["admin", "recepcionista"]:
        raise HTTPException(status_code=403, detail="Permiso denegado")

    stripe_service = StripeService(db)
    result = await stripe_service.get_payment_intent(payment_intent_id)

    if not result.success:
        raise HTTPException(status_code=400, detail=result.to_dict())

    return result.to_dict()


@router.post("/stripe/{payment_id}/refund", response_model=dict)
async def refund_stripe_payment(
    payment_id: int,
    amount: Optional[float] = None,
    reason: str = "requested_by_customer",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Procesa un reembolso de un pago Stripe.

    Si no especifica monto, reembolsa el monto total.

    **Razones válidas:**
    - `requested_by_customer`: Solicitado por el cliente
    - `duplicate`: Pago duplicado
    - `fraudulent`: Pago fraudulento
    - `general`: Razón general
    """
    # Validar permisos
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Solo administradores pueden procesar reembolsos"
        )

    stripe_service = StripeService(db)
    result = await stripe_service.refund_payment(
        payment_id=payment_id,
        amount=amount,
        reason=reason,
        user_id=current_user.id,
    )

    # Auditar
    log_action(
        db,
        user_id=current_user.id,
        entity="payment",
        entity_id=payment_id,
        action="refund_stripe_payment",
        details={
            "amount": amount,
            "reason": reason,
            "success": result.success,
        },
    )

    if not result.success:
        raise HTTPException(status_code=400, detail=result.to_dict())

    return result.to_dict()
