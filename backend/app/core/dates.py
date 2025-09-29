# app/core/dates.py
from datetime import date, timedelta

def compute_end_date(start_date: date, period: str, periods_count: int) -> date:
    if periods_count < 1:
        periods_count = 1
    if period == "day":
        delta = timedelta(days=periods_count)
    elif period == "week":
        delta = timedelta(weeks=periods_count)
    elif period == "fortnight":
        delta = timedelta(days=14 * periods_count)
    elif period == "month":
        # aproximado en días (30) para hostel; si quieres exacto por meses, podemos cambiarlo
        delta = timedelta(days=30 * periods_count)
    else:
        raise ValueError("Invalid period")
    # end_date exclusivo → almacenamos inclusivo (último día)
    return start_date + delta
