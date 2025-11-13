# app/services/currency.py
"""
Servicio para gestión de tasas de cambio y conversión de monedas.
Integración con APIs: dolarapi.com (Venezuela) y exchangerate-api.com (internacional).
"""
from datetime import datetime, timedelta
from typing import Dict

import httpx
from sqlalchemy.orm import Session

from ..models.exchange_rate import ExchangeRate


class CurrencyService:
    """Servicio para manejo de tasas de cambio."""

    # APIs de tasas de cambio
    DOLARAPI_URL = "https://ve.dolarapi.com/v1/dolares/oficial"
    EXCHANGERATE_API = "https://api.exchangerate-api.com/v4/latest/"

    @classmethod
    async def fetch_rates_from_dolarapi(cls) -> Dict[str, float] | None:
        """
        Obtiene tasas de cambio desde dolarapi.com (especializado en Venezuela).
        Retorna el precio del USD en Bs y calcula EUR.

        Returns:
            Dict con tasas {USD: price_in_bs, EUR: price_in_bs} o None si falla
        """
        try:
            async with httpx.AsyncClient() as client:
                # Obtener tasa USD/VES desde dolarapi
                response = await client.get(cls.DOLARAPI_URL, timeout=10.0)
                if response.status_code == 200:
                    data = response.json()
                    usd_price = data.get("precio")  # Precio oficial del USD en Bs

                    if usd_price:
                        # También obtener EUR/USD para calcular EUR en Bs
                        rates = await cls.fetch_rates_from_api("USD")
                        eur_price = None

                        if rates and "EUR" in rates:
                            # Si 1 USD = X EUR, entonces EUR en Bs = USD_price / X
                            eur_to_usd = rates.get("EUR", 1)
                            eur_price = usd_price / eur_to_usd if eur_to_usd > 0 else None

                        return {
                            "USD": usd_price,
                            "EUR": eur_price or usd_price * 1.1,  # Aproximación si no hay dato
                            "source": "dolarapi"
                        }
        except Exception as e:
            print(f"Error fetching rates from dolarapi: {e}")
        return None

    @classmethod
    async def fetch_rates_from_api(cls, base_currency: str = "USD") -> Dict[str, float] | None:
        """
        Obtiene tasas de cambio desde API externa (exchangerate-api.com).

        Args:
            base_currency: Moneda base (USD por defecto)

        Returns:
            Dict con tasas o None si falla
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{cls.EXCHANGERATE_API}{base_currency}", timeout=10.0)
                if response.status_code == 200:
                    data = response.json()
                    return data.get("rates", {})
        except Exception as e:
            print(f"Error fetching exchange rates: {e}")
        return None

    @classmethod
    def update_rates_from_api(cls, db: Session, use_dolarapi: bool = True) -> bool:
        """
        Actualiza tasas de cambio en la BD desde API externa (sync wrapper).

        Args:
            db: Sesión de base de datos
            use_dolarapi: Si True, usa dolarapi.com para Venezuela. Si False, usa exchangerate-api.com

        Returns:
            True si se actualizó exitosamente
        """
        import asyncio

        if use_dolarapi:
            # Para Venezuela, usar dolarapi como fuente principal
            rates = asyncio.run(cls.fetch_rates_from_dolarapi())
            source = "dolarapi.com"
        else:
            # Alternativa: usar exchangerate-api
            rates = asyncio.run(cls.fetch_rates_from_api("USD"))
            source = "exchangerate-api.com"

        if not rates:
            return False

        # Guardar tasas en BD (VES es la moneda base en Venezuela)
        # Convertir para almacenar tasas de moneda a moneda
        base_currency = "VES"
        usd_price = rates.get("USD", 1)
        eur_price = rates.get("EUR", 1)

        # Si no hay precios, usar valores por defecto
        if not usd_price:
            return False

        # Guardar tasa VES -> USD
        if usd_price > 0:
            exchange_rate = ExchangeRate(
                from_currency=base_currency,
                to_currency="USD",
                rate=1 / usd_price,  # 1 USD = X Bs, entonces 1 Bs = 1/X USD
                source=source,
                is_manual=0,
            )
            db.add(exchange_rate)

        # Guardar tasa VES -> EUR
        if eur_price and eur_price > 0:
            exchange_rate = ExchangeRate(
                from_currency=base_currency,
                to_currency="EUR",
                rate=1 / eur_price,  # 1 EUR = Y Bs, entonces 1 Bs = 1/Y EUR
                source=source,
                is_manual=0,
            )
            db.add(exchange_rate)

        # También guardar tasas inversas para facilitar conversiones
        exchange_rate_usd = ExchangeRate(
            from_currency="USD",
            to_currency=base_currency,
            rate=usd_price,
            source=source,
            is_manual=0,
        )
        db.add(exchange_rate_usd)

        if eur_price:
            exchange_rate_eur = ExchangeRate(
                from_currency="EUR",
                to_currency=base_currency,
                rate=eur_price,
                source=source,
                is_manual=0,
            )
            db.add(exchange_rate_eur)

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
    def get_current_rates(cls, db: Session) -> Dict[str, float | None]:
        """
        Obtiene las tasas de cambio actuales en formato amigable.
        Retorna: {USD: precio_en_bs, EUR: precio_en_bs}

        Returns:
            Dict con tasas actuales o valores por defecto
        """
        usd_rate = ExchangeRate.get_latest_rate(db, "USD", "VES")
        eur_rate = ExchangeRate.get_latest_rate(db, "EUR", "VES")

        return {
            "USD": usd_rate or 0,
            "EUR": eur_rate or 0,
            "timestamp": datetime.utcnow().isoformat(),
        }

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
