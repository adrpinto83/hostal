from __future__ import annotations

from typing import Literal, cast

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_
from sqlalchemy.orm import Session, joinedload

from app.core.dates import compute_end_date
from app.core.db import get_db
from app.core.security import require_roles
from app.models.guest import Guest
from app.models.payment import Currency, Payment, PaymentStatus
from app.models.reservation import Period as PeriodEnum
from app.models.reservation import Reservation, ReservationStatus
from app.models.room import Room
from app.models.room_rate import RoomRate
from app.schemas.reservation import ReservationCreate, ReservationOut

router = APIRouter(prefix="/reservations", tags=["reservations"])


def _range_overlap(q, start, end):
    """
    Filtra traslapes de rangos en la misma habitación.
    Usamos < y > para permitir reservas consecutivas (salida y entrada el mismo día).
    """
    return q.filter(and_(Reservation.start_date < end, Reservation.end_date > start))


@router.post(
    "/",
    response_model=ReservationOut,
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Crear una nueva reserva",
    description="Crea una reserva para un huésped en una habitación. Valida que no existan solapamientos de fechas.",
)
def create_reservation(data: ReservationCreate, db: Session = Depends(get_db)):
    # Validaciones de entidades
    if not db.get(Guest, data.guest_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail={"error": "Guest not found"}
        )
    room = db.get(Room, data.room_id)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail={"error": "Room not found"}
        )

    # Normalizar enum Period
    if isinstance(data.period, PeriodEnum):
        period_enum = data.period
        period_value = data.period.value
    else:
        try:
            period_enum = PeriodEnum(str(data.period))
        except ValueError:
            raise HTTPException(status_code=400, detail={"error": "Invalid period"}) from None
        period_value = period_enum.value

    # Calcular end_date con helper
    period_literal = cast(Literal["day", "week", "fortnight", "month"], period_value)
    end_date = compute_end_date(data.start_date, period_literal, data.periods_count)

    # Validar solapamiento en misma habitación
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

    # Determinar precio (si no se envía). Aquí asumimos tarifa por PERÍODO.
    price_bs = data.price_bs
    if price_bs is None:
        rate = (
            db.query(RoomRate)
            .filter(RoomRate.room_id == data.room_id, RoomRate.period == period_value)
            .first()
        )
        if not rate:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "No room rate found for given period; provide price_bs"},
            )
        # Si la tarifa es POR PERÍODO, multiplicar por cantidad de períodos
        price_bs = rate.price_bs * data.periods_count

    # Crear reserva
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

    # Crear un Payment automático para acreditar el costo a la cuenta del huésped
    # El status es "pending" porque aún no se ha pagado
    payment = Payment(
        guest_id=data.guest_id,
        reservation_id=res.id,
        amount=price_bs,
        currency=Currency.VES,
        amount_ves=price_bs,
        status=PaymentStatus.pending,
        notes=f"Costo de reserva - Habitación {room.number} ({res.start_date} a {res.end_date})",
    )
    db.add(payment)
    db.commit()
    db.refresh(res)

    return res


@router.get(
    "/",
    response_model=list[ReservationOut],
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Listar todas las reservas",
    description="Obtiene una lista de reservas con opciones de filtrado y paginación.",
)
def list_reservations(
    db: Session = Depends(get_db),
    guest_id: int | None = None,
    room_id: int | None = None,
    status: list[str] | None = Query(
        None, description="Puede repetirse ?status=pending&status=active"
    ),
    q: str | None = None,
    limit: int = 50,
    offset: int = 0,
):
    query = (
        db.query(Reservation)
        .options(
            joinedload(Reservation.guest),
            joinedload(Reservation.room),
        )
        .order_by(Reservation.start_date.desc())
    )

    if guest_id:
        query = query.filter(Reservation.guest_id == guest_id)
    if room_id:
        query = query.filter(Reservation.room_id == room_id)

    if status:
        try:
            statuses = [ReservationStatus(s) for s in status]
        except ValueError as e:
            raise HTTPException(
                status_code=400, detail={"error": f"Invalid status in {status}"}
            ) from e
        query = query.filter(Reservation.status.in_(statuses))

    if q:
        like = f"%{q}%"
        query = query.filter(Reservation.notes.ilike(like))

    return query.offset(offset).limit(limit).all()


@router.post(
    "/{reservation_id}/confirm",
    response_model=ReservationOut,
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Confirmar una reserva",
    description="Cambia el estado de una reserva de 'pending' a 'active'.",
)
def confirm_reservation(reservation_id: int, db: Session = Depends(get_db)):
    reservation = db.get(Reservation, reservation_id)
    if not reservation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail={"error": "Reservation not found"}
        )

    if reservation.status != ReservationStatus.pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": f"Cannot confirm reservation with status '{reservation.status.value}'"
            },
        )

    reservation.status = ReservationStatus.active
    db.commit()
    db.refresh(reservation)
    return reservation


@router.post(
    "/{reservation_id}/cancel",
    response_model=ReservationOut,
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Cancelar una reserva",
    description="Cambia el estado de una reserva a 'cancelled'. No se puede cancelar si ya está en un estado final.",
)
def cancel_reservation(reservation_id: int, db: Session = Depends(get_db)):
    reservation = db.get(Reservation, reservation_id)
    if not reservation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail={"error": "Reservation not found"}
        )

    if reservation.status in (ReservationStatus.cancelled, ReservationStatus.checked_out):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": f"Cannot cancel reservation with status '{reservation.status.value}'"},
        )

    reservation.status = ReservationStatus.cancelled
    db.commit()
    db.refresh(reservation)
    return reservation
