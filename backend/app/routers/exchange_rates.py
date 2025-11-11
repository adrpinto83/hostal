# app/routers/exchange_rates.py
"""Endpoints para gestión de tasas de cambio."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..core.security import require_roles
from ..models.exchange_rate import ExchangeRate
from ..services.currency import CurrencyService

router = APIRouter(prefix="/exchange-rates", tags=["Exchange Rates"])


@router.post(
    "/update",
    dependencies=[Depends(require_roles("admin"))],
    summary="Actualizar tasas desde API externa",
)
def update_exchange_rates(db: Session = Depends(get_db)):
    """Actualiza las tasas de cambio desde una API externa."""
    success = CurrencyService.update_rates_from_api(db, base_currency="USD")

    if not success:
        raise HTTPException(status_code=500, detail="Failed to fetch exchange rates from API")

    return {"message": "Exchange rates updated successfully", "timestamp": "now"}


@router.get(
    "/latest",
    summary="Obtener tasas de cambio actuales",
)
def get_latest_rates(base_currency: str = "USD", db: Session = Depends(get_db)):
    """Obtiene las últimas tasas de cambio."""
    rates = CurrencyService.get_latest_rates(db, base_currency)

    if not rates:
        raise HTTPException(status_code=404, detail="No exchange rates found")

    return {"base_currency": base_currency, "rates": rates}


@router.post(
    "/convert",
    summary="Convertir monto entre monedas",
)
def convert_currency(
    amount: float, from_currency: str, to_currency: str, db: Session = Depends(get_db)
):
    """Convierte un monto de una moneda a otra."""
    result = CurrencyService.convert_amount(db, amount, from_currency, to_currency)

    if result["converted_amount"] is None:
        raise HTTPException(
            status_code=404, detail=f"No rate found for {from_currency} to {to_currency}"
        )

    return result


@router.post(
    "/convert-all",
    summary="Convertir a todas las monedas",
)
def convert_to_all(amount: float, from_currency: str, db: Session = Depends(get_db)):
    """Convierte un monto a todas las monedas soportadas (EUR, USD, VES)."""
    result = CurrencyService.convert_to_all_currencies(db, amount, from_currency)
    return {"amount": amount, "from_currency": from_currency, "conversions": result}
