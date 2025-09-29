from datetime import date, timedelta
from typing import Literal, Union

Period = Literal["day", "week", "fortnight", "month"]

def _ensure_date(d: Union[str, date]) -> date:
    if isinstance(d, date):
        return d
    # ISO yyyy-mm-dd
    return date.fromisoformat(d)

def compute_end_date(start_date: Union[str, date], period: Period, periods_count: int = 1) -> date:
    start = _ensure_date(start_date)
    if period == "day":
        delta = timedelta(days=periods_count - 1)
    elif period == "week":
        delta = timedelta(days=periods_count * 7 - 1)
    elif period == "fortnight":
        delta = timedelta(days=periods_count * 14 - 1)
    elif period == "month":
        # “Mes” = 30 días fijos (simple). Si quieres meses calendario reales, avísame y lo cambiamos.
        delta = timedelta(days=periods_count * 30 - 1)
    else:
        raise ValueError("Invalid period")
    return start + delta
