from __future__ import annotations

from datetime import date, timedelta
from typing import Literal, TypeAlias, Union

Period: TypeAlias = Literal["day", "week", "fortnight", "month"]


def _ensure_date(d: Union[str, date]) -> date:
    if isinstance(d, date):
        return d
    # ISO yyyy-mm-dd
    return date.fromisoformat(d)


def compute_end_date(start_date: date, period: Period, periods_count: int) -> date:
    if period == "day":
        delta = timedelta(days=periods_count - 1)
    elif period == "week":
        delta = timedelta(days=periods_count * 7 - 1)
    elif period == "fortnight":
        delta = timedelta(days=periods_count * 14 - 1)
    elif period == "month":
        # 30 días fijos; si quieres meses calendario reales, lo cambiamos luego
        delta = timedelta(days=periods_count * 30 - 1)
    else:
        # Defensa por si el tipado se pierde en runtime
        raise ValueError("Invalid period")
    return start_date + delta
