from __future__ import annotations

from typing import Literal, cast

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_
from sqlalchemy.orm import Session

from ..core.dates import compute_end_date
from ..core.db import get_db
from ..core.security import require_roles
from ..models.guest import Guest
from ..models.reservation import (
    Period as PeriodEnum,
)
from ..models.reservation import (
    Reservation,
    ReservationStatus,
)
from ..models.room import Room
from ..models.room_rate import RoomRate
from ..schemas.reservation import ReservationCreate, ReservationOut

router = APIRouter(prefix="/reservations", tags=["reservations"])


def _range_overlap(q, start, end):
    """Filtra traslapes de rangos en la misma habitación."""
    return q.filter(and_(Reservation.start_date <= end, Reservation.end_date >= start))


@router.post(
    "/",
    response_model=ReservationOut,
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
)
def create_reservation(data: ReservationCreate, db: Session = Depends(get_db)):
    if not db.get(Guest, data.guest_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guest not found")
    room = db.get(Room, data.room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")

    if isinstance(data.period, PeriodEnum):
        period_enum = data.period
        period_value = data.period.value
    else:
        try:
            period_enum = PeriodEnum(str(data.period))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid period") from None
        period_value = period_enum.value

    period_literal = cast(Literal["day", "week", "fortnight", "month"], period_value)
    end_date = compute_end_date(data.start_date, period_literal, data.periods_count)

    overlap = _range_overlap(
        db.query(Reservation).filter(Reservation.room_id == data.room_id),
        start=data.start_date,
        end=end_date,
    ).first()
    if overlap:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": "Room already reserved in that range",
                "conflict_id": overlap.id,
                "conflict_start": overlap.start_date.isoformat(),
                "conflict_end": overlap.end_date.isoformat(),
            },
        )

    price_bs = data.price_bs
    if price_bs is None:
        rate = db.query(RoomRate).filter_by(room_id=data.room_id, period=period_value).first()
        if not rate:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No room rate found for given period; provide price_bs",
            )
        price_bs = rate.price_bs

    res = Reservation(
        guest_id=data.guest_id,
        room_id=data.room_id,
        start_date=data.start_date,
        end_date=end_date,
        period=period_enum,
        periods_count=data.periods_count,
        price_bs=price_bs,
        status=ReservationStatus.pending,
        notes=data.notes,
    )
    db.add(res)
    db.commit()
    db.refresh(res)
    return res


@router.get(
    "/",
    response_model=list[ReservationOut],
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
)
def list_reservations(
    db: Session = Depends(get_db),
    guest_id: int | None = None,
    room_id: int | None = None,
    status: str | None = Query(None, pattern="^(pending|active|checked_out|cancelled)$"),
    q: str | None = None,
    limit: int = 50,
    offset: int = 0,
):
    query = db.query(Reservation)

    if guest_id:
        query = query.filter(Reservation.guest_id == guest_id)
    if room_id:
        query = query.filter(Reservation.room_id == room_id)

    if status:
        try:
            status_enum = ReservationStatus(status)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid status") from None
        query = query.filter(Reservation.status == status_enum)

    if q:
        like = f"%{q}%"
        query = query.filter(Reservation.notes.ilike(like))

    return query.order_by(Reservation.start_date.desc()).offset(offset).limit(limit).all()


@router.post(
    "/{reservation_id}/confirm",
    response_model=ReservationOut,
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
)
def confirm_reservation(reservation_id: int, db: Session = Depends(get_db)):
    """
    Confirma una reserva, cambiando su estado de 'pending' a 'active'.
    """
    reservation = db.get(Reservation, reservation_id)
    if not reservation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")

    if reservation.status != ReservationStatus.pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot confirm reservation with status '{reservation.status.value}'",
        )

    reservation.status = ReservationStatus.active
    db.commit()
    db.refresh(reservation)
    return reservation


@router.post(
    "/{reservation_id}/cancel",
    response_model=ReservationOut,
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
)
def cancel_reservation(reservation_id: int, db: Session = Depends(get_db)):
    """
    Cancela una reserva, cambiando su estado a 'cancelled'.
    """
    reservation = db.get(Reservation, reservation_id)
    if not reservation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")

    if reservation.status in (ReservationStatus.cancelled, ReservationStatus.checked_out):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel reservation with status '{reservation.status.value}'",
        )

    reservation.status = ReservationStatus.cancelled
    db.commit()
    db.refresh(reservation)
    return reservation
