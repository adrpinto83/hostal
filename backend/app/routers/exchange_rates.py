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
    summary="Actualizar tasas desde dolarapi.com",
)
def update_exchange_rates(use_dolarapi: bool = True, db: Session = Depends(get_db)):
    """
    Actualiza las tasas de cambio desde API externa.

    - Si use_dolarapi=True (default): usa dolarapi.com (especializado para Venezuela)
    - Si use_dolarapi=False: usa exchangerate-api.com
    """
    success = CurrencyService.update_rates_from_api(db, use_dolarapi=use_dolarapi)

    if not success:
        api_name = "dolarapi.com" if use_dolarapi else "exchangerate-api.com"
        raise HTTPException(status_code=500, detail=f"Failed to fetch exchange rates from {api_name}")

    return {
        "message": "Exchange rates updated successfully",
        "source": "dolarapi.com" if use_dolarapi else "exchangerate-api.com",
        "rates": CurrencyService.get_current_rates(db),
    }


@router.get(
    "/current",
    summary="Obtener tasas de cambio actuales (simple)",
)
def get_current_rates(db: Session = Depends(get_db)):
    """
    Obtiene las tasas de cambio actuales en formato simple.
    Retorna el precio del USD y EUR en Bolívares.
    """
    rates = CurrencyService.get_current_rates(db)
    return rates


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
