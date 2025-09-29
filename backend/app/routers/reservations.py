# app/routers/reservations.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from ..core.db import get_db
from ..core.security import require_roles
from ..core.dates import compute_end_date
from ..models.guest import Guest
from ..models.room import Room
from ..models.room_rate import RoomRate
from ..models.reservation import Reservation
from ..schemas.reservation import ReservationCreate, ReservationOut

router = APIRouter(prefix="/reservations", tags=["reservations"])

def _range_overlap(q, start, end):
    # (start_date <= end) AND (end_date >= start)
    return q.filter(and_(Reservation.start_date <= end, Reservation.end_date >= start))

@router.post("/", response_model=ReservationOut, dependencies=[Depends(require_roles("admin","recepcionista"))])
def create_reservation(data: ReservationCreate, db: Session = Depends(get_db)):
    # Validar entidades
    if not db.get(Guest, data.guest_id):
        raise HTTPException(404, "Guest not found")
    if not db.get(Room, data.room_id):
        raise HTTPException(404, "Room not found")

    # Calcular end_date
    end_date = compute_end_date(data.start_date, data.period, data.periods_count)

    # Evitar traslapes en misma habitación
    overlap = _range_overlap(
        db.query(Reservation).filter(Reservation.room_id == data.room_id),
        start=data.start_date, end=end_date
    ).first()
    if overlap:
        raise HTTPException(409, "Room already reserved in that range")

    # Resolver price_bs: si no viene, tomar tarifa por período
    price_bs = data.price_bs
    if price_bs is None:
        rate = db.query(RoomRate).filter_by(room_id=data.room_id, period=data.period).first()
        if not rate:
            raise HTTPException(400, "No room rate found for given period; provide price_bs")
        price_bs = rate.price_bs

    res = Reservation(
        guest_id=data.guest_id,
        room_id=data.room_id,
        start_date=data.start_date,
        end_date=end_date,
        period=data.period,
        periods_count=data.periods_count,
        price_bs=price_bs,
        status="pending",
        notes=data.notes,
    )
    db.add(res)
    db.commit()
    db.refresh(res)
    return res

@router.get("/", response_model=list[ReservationOut],
            dependencies=[Depends(require_roles("admin","recepcionista"))])
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
        query = query.filter(Reservation.status == status)
    if q:
        # búsqueda simple por notas
        like = f"%{q}%"
        query = query.filter(Reservation.notes.ilike(like))
    return query.order_by(Reservation.start_date.desc()).offset(offset).limit(limit).all()
