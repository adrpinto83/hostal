# app/models/exchange_rate.py
"""
Modelo para almacenar tasas de cambio entre monedas.
Permite histórico de tasas y conversión automática.
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, String, UniqueConstraint

from ..core.db import Base


class ExchangeRate(Base):
    """Tasas de cambio entre monedas."""
    __tablename__ = "exchange_rates"
    __table_args__ = (
        UniqueConstraint("from_currency", "to_currency", "date", name="uq_rate_currencies_date"),
    )

    id = Column(Integer, primary_key=True, index=True)

    # Monedas
    from_currency = Column(String(3), nullable=False, index=True)  # EUR, USD, VES
    to_currency = Column(String(3), nullable=False, index=True)  # EUR, USD, VES

    # Tasa de cambio
    rate = Column(Float, nullable=False)  # Cuánto vale 1 unidad de from_currency en to_currency

    # Fecha y validez
    date = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    valid_until = Column(DateTime, nullable=True)  # Opcional: hasta cuándo es válida

    # Fuente y metadatos
    source = Column(String(100), nullable=True)  # API, manual, banco, etc.
    is_manual = Column(Integer, default=0)  # 0 = automática, 1 = manual

    # Auditoría
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True, onupdate=datetime.utcnow)

    @classmethod
    def get_latest_rate(cls, db, from_curr: str, to_curr: str) -> float | None:
        """Obtiene la tasa más reciente entre dos monedas."""
        rate = (
            db.query(cls)
            .filter(cls.from_currency == from_curr, cls.to_currency == to_curr)
            .order_by(cls.date.desc())
            .first()
        )
        return rate.rate if rate else None

    @classmethod
    def convert(cls, db, amount: float, from_curr: str, to_curr: str) -> float | None:
        """Convierte un monto de una moneda a otra."""
        if from_curr == to_curr:
            return amount

        rate = cls.get_latest_rate(db, from_curr, to_curr)
        if rate:
            return amount * rate

        # Si no hay tasa directa, intentar conversión indirecta vía USD
        if from_curr != "USD" and to_curr != "USD":
            rate_to_usd = cls.get_latest_rate(db, from_curr, "USD")
            rate_from_usd = cls.get_latest_rate(db, "USD", to_curr)
            if rate_to_usd and rate_from_usd:
                return amount * rate_to_usd * rate_from_usd

        return None
