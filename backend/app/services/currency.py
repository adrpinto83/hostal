# app/services/currency.py
"""
Servicio para gestión de tasas de cambio y conversión de monedas.
Incluye integración con APIs externas.
"""
from datetime import datetime, timedelta
from typing import Dict

import httpx
from sqlalchemy.orm import Session

from ..models.exchange_rate import ExchangeRate


class CurrencyService:
    """Servicio para manejo de tasas de cambio."""

    # API gratuita para tasas de cambio
    API_URL = "https://api.exchangerate-api.com/v4/latest/"
    # Alternativa: "https://api.exchangerate.host/latest"

    @classmethod
    async def fetch_rates_from_api(cls, base_currency: str = "USD") -> Dict[str, float] | None:
        """
        Obtiene tasas de cambio desde API externa.

        Args:
            base_currency: Moneda base (USD por defecto)

        Returns:
            Dict con tasas o None si falla
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{cls.API_URL}{base_currency}", timeout=10.0)
                if response.status_code == 200:
                    data = response.json()
                    return data.get("rates", {})
        except Exception as e:
            print(f"Error fetching exchange rates: {e}")
        return None

    @classmethod
    def update_rates_from_api(cls, db: Session, base_currency: str = "USD") -> bool:
        """
        Actualiza tasas de cambio en la BD desde API externa (sync wrapper).

        Args:
            db: Sesión de base de datos
            base_currency: Moneda base

        Returns:
            True si se actualizó exitosamente
        """
        import asyncio

        rates = asyncio.run(cls.fetch_rates_from_api(base_currency))

        if not rates:
            return False

        # Guardar tasas en BD
        for target_curr, rate in rates.items():
            if target_curr in ["EUR", "USD", "VES"]:
                exchange_rate = ExchangeRate(
                    from_currency=base_currency,
                    to_currency=target_curr,
                    rate=rate,
                    source="exchangerate-api.com",
                    is_manual=0,
                )
                db.add(exchange_rate)

        db.commit()
        return True

    @classmethod
    def convert_amount(
        cls, db: Session, amount: float, from_currency: str, to_currency: str
    ) -> Dict[str, float | None]:
        """
        Convierte un monto entre monedas.

        Args:
            db: Sesión de base de datos
            amount: Monto a convertir
            from_currency: Moneda origen
            to_currency: Moneda destino

        Returns:
            Dict con {amount, converted_amount, rate}
        """
        if from_currency == to_currency:
            return {"amount": amount, "converted_amount": amount, "rate": 1.0}

        converted = ExchangeRate.convert(db, amount, from_currency, to_currency)
        rate = ExchangeRate.get_latest_rate(db, from_currency, to_currency)

        return {"amount": amount, "converted_amount": converted, "rate": rate}

    @classmethod
    def convert_to_all_currencies(
        cls, db: Session, amount: float, from_currency: str
    ) -> Dict[str, float]:
        """
        Convierte un monto a todas las monedas soportadas.

        Args:
            db: Sesión de base de datos
            amount: Monto a convertir
            from_currency: Moneda origen

        Returns:
            Dict con {"EUR": x, "USD": y, "VES": z}
        """
        currencies = ["EUR", "USD", "VES"]
        result = {}

        for currency in currencies:
            if currency == from_currency:
                result[currency] = amount
            else:
                converted = ExchangeRate.convert(db, amount, from_currency, currency)
                result[currency] = converted if converted is not None else 0.0

        return result

    @classmethod
    def get_latest_rates(cls, db: Session, base_currency: str = "USD") -> Dict[str, float]:
        """
        Obtiene las últimas tasas de cambio desde la BD.

        Args:
            db: Sesión de base de datos
            base_currency: Moneda base

        Returns:
            Dict con tasas actuales
        """
        rates = {}
        currencies = ["EUR", "USD", "VES"]

        for currency in currencies:
            if currency != base_currency:
                rate = ExchangeRate.get_latest_rate(db, base_currency, currency)
                if rate:
                    rates[currency] = rate

        return rates

    @classmethod
    def should_update_rates(cls, db: Session) -> bool:
        """
        Verifica si es necesario actualizar las tasas (más de 24 horas).

        Returns:
            True si debe actualizar
        """
        latest_rate = db.query(ExchangeRate).order_by(ExchangeRate.date.desc()).first()

        if not latest_rate:
            return True

        age = datetime.utcnow() - latest_rate.date
        return age > timedelta(hours=24)
