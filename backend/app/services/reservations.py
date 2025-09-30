# app/services/reservations.py
from datetime import date

from sqlalchemy.orm import Session

from ..models.reservation import Reservation


def has_overlap(
    db: Session, room_id: int, start_date: date, end_date: date, exclude_id: int | None = None
) -> bool:
    q = db.query(Reservation).filter(
        Reservation.room_id == room_id,
        Reservation.start_date < end_date,
        Reservation.end_date > start_date,
    )
    if exclude_id:
        q = q.filter(Reservation.id != exclude_id)
    return db.query(q.exists()).scalar()  # True si hay choque
