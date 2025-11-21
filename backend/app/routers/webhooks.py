# app/routers/webhooks.py
"""
Routers para manejar webhooks de pasarelas de pago.
Soporta:
- Stripe webhooks
- PayPal webhooks (futura implementación)
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..core.audit import log_action
from ..services.stripe_service import StripeService

router = APIRouter(prefix="/api/v1/webhooks", tags=["webhooks"])


@router.post("/stripe")
async def handle_stripe_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Maneja webhooks de Stripe.

    Stripe envía eventos HTTPS POST a este endpoint cuando ocurren eventos
    en tu cuenta de Stripe (ej: pagos completados, fallos, reembolsos).

    **Eventos manejados:**
    - `payment_intent.succeeded`: Pago completado exitosamente
    - `payment_intent.payment_failed`: Pago fallido
    - `charge.refunded`: Reembolso procesado

    **Seguridad:**
    - Todos los webhooks vienen firmados por Stripe
    - La firma se verifica usando STRIPE_WEBHOOK_SECRET
    - Se deduplicarán automáticamente si se reciben dos veces

    **Respuesta:**
    - 200 OK: Webhook procesado exitosamente
    - 400 Bad Request: Firma inválida o error en el procesamiento
    - 500 Internal Server Error: Error en el servidor
    """
    try:
        # Obtener payload y firma
        payload = await request.body()
        signature = request.headers.get("stripe-signature", "")

        if not signature:
            raise HTTPException(
                status_code=400,
                detail="Falta header stripe-signature"
            )

        # Procesar webhook
        stripe_service = StripeService(db)
        result = await stripe_service.process_webhook(payload, signature)

        if not result.success:
            raise HTTPException(
                status_code=400,
                detail=result.to_dict()
            )

        return {
            "success": True,
            "message": result.message,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": str(e)}
        )


@router.post("/paypal")
async def handle_paypal_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Maneja webhooks de PayPal.

    Endpoint placeholder para futura integración con PayPal.

    **Estado:** No implementado aún
    """
    raise HTTPException(
        status_code=501,
        detail="Integración con PayPal no implementada"
    )
