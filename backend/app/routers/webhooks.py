# app/routers/webhooks.py
"""
Routers para manejar webhooks de pasarelas de pago.
Soporta:
- PayPal webhooks (futura implementación)
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..core.db import get_db

router = APIRouter(prefix="/api/v1/webhooks", tags=["webhooks"])


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
