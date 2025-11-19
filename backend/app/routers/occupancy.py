# app/routers/occupancy.py
"""Endpoints para gestión de ocupación (check-in/check-out)."""
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..core.security import get_current_user, require_roles
from ..models.guest import Guest
from ..models.occupancy import Occupancy
from ..models.reservation import Reservation
from ..models.room import Room, RoomStatus
from ..models.user import User

router = APIRouter(prefix="/occupancy", tags=["Occupancy"])


# Schemas
class OccupancyBase(BaseModel):
    room_id: int
    guest_id: int
    reservation_id: int | None = None
    amount_paid_bs: float | None = Field(None, ge=0)
    amount_paid_usd: float | None = Field(None, ge=0)
    payment_method: str | None = Field(None, max_length=50)
    notes: str | None = None


class CheckInRequest(OccupancyBase):
    check_in: datetime | None = None  # Si no se proporciona, usa datetime.utcnow()


class CheckOutRequest(BaseModel):
    check_out: datetime | None = None  # Si no se proporciona, usa datetime.utcnow()
    amount_paid_bs: float | None = Field(None, ge=0)
    amount_paid_usd: float | None = Field(None, ge=0)
    payment_method: str | None = Field(None, max_length=50)
    notes: str | None = None


class OccupancyResponse(BaseModel):
    id: int
    room_id: int
    guest_id: int
    reservation_id: int | None
    check_in: str
    check_out: str | None
    amount_paid_bs: float | None
    amount_paid_usd: float | None
    payment_method: str | None
    notes: str | None

    # Información relacionada
    room_number: str | None = None
    guest_name: str | None = None
    is_active: bool = False
    duration_hours: float | None = None

    class Config:
        from_attributes = True


# Endpoints
@router.post(
    "/check-in",
    response_model=OccupancyResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("admin", "gerente", "recepcionista"))],
    summary="Hacer check-in",
)
def check_in(
    check_in_data: CheckInRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Registra el check-in de un huésped en una habitación.

    - Verifica que la habitación exista y esté disponible
    - Verifica que el huésped exista
    - Actualiza el estado de la habitación a 'occupied'
    - Registra la fecha/hora de check-in
    """
    # Verificar que la habitación existe
    room = db.get(Room, check_in_data.room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Habitación no encontrada")

    # Verificar que la habitación esté disponible
    if room.status not in [RoomStatus.available, RoomStatus.cleaning]:
        raise HTTPException(
            status_code=400,
            detail=f"La habitación {room.number} no está disponible (estado: {room.status.value})",
        )

    # Verificar que el huésped existe
    guest = db.get(Guest, check_in_data.guest_id)
    if not guest:
        raise HTTPException(status_code=404, detail="Huésped no encontrado")

    # Verificar que no haya otra ocupación activa en la misma habitación
    active_occupancy = (
        db.query(Occupancy)
        .filter(Occupancy.room_id == check_in_data.room_id, Occupancy.check_out.is_(None))
        .first()
    )
    if active_occupancy:
        raise HTTPException(
            status_code=400,
            detail=f"La habitación {room.number} ya tiene una ocupación activa",
        )

    # Crear ocupación
    check_in_time = check_in_data.check_in or datetime.utcnow()
    occupancy = Occupancy(
        room_id=check_in_data.room_id,
        guest_id=check_in_data.guest_id,
        reservation_id=check_in_data.reservation_id,
        check_in=check_in_time,
        amount_paid_bs=check_in_data.amount_paid_bs,
        amount_paid_usd=check_in_data.amount_paid_usd,
        payment_method=check_in_data.payment_method,
        notes=check_in_data.notes,
    )

    # Actualizar estado de la habitación
    room.status = RoomStatus.occupied

    db.add(occupancy)
    db.commit()
    db.refresh(occupancy)

    return OccupancyResponse(
        id=occupancy.id,
        room_id=occupancy.room_id,
        guest_id=occupancy.guest_id,
        reservation_id=occupancy.reservation_id,
        check_in=occupancy.check_in.isoformat(),
        check_out=None,
        amount_paid_bs=occupancy.amount_paid_bs,
        amount_paid_usd=occupancy.amount_paid_usd,
        payment_method=occupancy.payment_method,
        notes=occupancy.notes,
        room_number=room.number,
        guest_name=guest.full_name,
        is_active=True,
        duration_hours=None,
    )


@router.post(
    "/{occupancy_id}/check-out",
    response_model=OccupancyResponse,
    dependencies=[Depends(require_roles("admin", "gerente", "recepcionista"))],
    summary="Hacer check-out",
)
def check_out(
    occupancy_id: int,
    check_out_data: CheckOutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Registra el check-out de un huésped.

    - Verifica que la ocupación exista y esté activa
    - Registra la fecha/hora de check-out
    - Actualiza el estado de la habitación a 'cleaning'
    - Opcionalmente registra pagos adicionales
    """
    occupancy = db.get(Occupancy, occupancy_id)
    if not occupancy:
        raise HTTPException(status_code=404, detail="Ocupación no encontrada")

    if occupancy.check_out:
        raise HTTPException(
            status_code=400,
            detail=f"El check-out ya fue registrado el {occupancy.check_out.isoformat()}",
        )

    # Registrar check-out
    check_out_time = check_out_data.check_out or datetime.utcnow()
    occupancy.check_out = check_out_time

    # Actualizar pagos si se proporcionan
    if check_out_data.amount_paid_bs:
        occupancy.amount_paid_bs = (occupancy.amount_paid_bs or 0) + check_out_data.amount_paid_bs
    if check_out_data.amount_paid_usd:
        occupancy.amount_paid_usd = (occupancy.amount_paid_usd or 0) + check_out_data.amount_paid_usd
    if check_out_data.payment_method:
        occupancy.payment_method = check_out_data.payment_method
    if check_out_data.notes:
        current_notes = occupancy.notes or ""
        occupancy.notes = f"{current_notes}\n{check_out_data.notes}".strip()

    # Actualizar estado de la habitación a 'cleaning'
    room = db.get(Room, occupancy.room_id)
    if room:
        room.status = RoomStatus.cleaning

    db.commit()
    db.refresh(occupancy)

    # Calcular duración
    duration_hours = (occupancy.check_out - occupancy.check_in).total_seconds() / 3600

    return OccupancyResponse(
        id=occupancy.id,
        room_id=occupancy.room_id,
        guest_id=occupancy.guest_id,
        reservation_id=occupancy.reservation_id,
        check_in=occupancy.check_in.isoformat(),
        check_out=occupancy.check_out.isoformat(),
        amount_paid_bs=occupancy.amount_paid_bs,
        amount_paid_usd=occupancy.amount_paid_usd,
        payment_method=occupancy.payment_method,
        notes=occupancy.notes,
        room_number=room.number if room else None,
        guest_name=occupancy.guest.full_name if occupancy.guest else None,
        is_active=False,
        duration_hours=round(duration_hours, 2),
    )


@router.get(
    "/",
    response_model=List[OccupancyResponse],
    dependencies=[Depends(require_roles("admin", "gerente", "recepcionista"))],
    summary="Listar ocupaciones",
)
def list_occupancies(
    room_id: int | None = None,
    guest_id: int | None = None,
    active_only: bool = Query(False, description="Solo ocupaciones activas (sin check-out)"),
    q: str | None = Query(None, description="Buscar por nombre/documento del huésped o número de habitación"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Lista las ocupaciones con filtros opcionales.

    - **room_id**: Filtrar por habitación
    - **guest_id**: Filtrar por huésped
    - **active_only**: Solo ocupaciones activas (sin check-out)
    """
    query = db.query(Occupancy)

    if room_id:
        query = query.filter(Occupancy.room_id == room_id)
    if guest_id:
        query = query.filter(Occupancy.guest_id == guest_id)
    if active_only:
        query = query.filter(Occupancy.check_out.is_(None))
    if q:
        like = f"%{q}%"
        query = (
            query.join(Guest, Occupancy.guest_id == Guest.id, isouter=True)
            .join(Room, Occupancy.room_id == Room.id, isouter=True)
            .filter(
                or_(
                    Guest.full_name.ilike(like),
                    Guest.document_id.ilike(like),
                    Room.number.ilike(like),
                    Occupancy.notes.ilike(like),
                )
            )
        )

    query = query.order_by(Occupancy.check_in.desc())
    occupancies = query.offset(skip).limit(limit).all()

    results = []
    for occ in occupancies:
        duration_hours = None
        if occ.check_out:
            duration_hours = (occ.check_out - occ.check_in).total_seconds() / 3600

        results.append(
            OccupancyResponse(
                id=occ.id,
                room_id=occ.room_id,
                guest_id=occ.guest_id,
                reservation_id=occ.reservation_id,
                check_in=occ.check_in.isoformat(),
                check_out=occ.check_out.isoformat() if occ.check_out else None,
                amount_paid_bs=occ.amount_paid_bs,
                amount_paid_usd=occ.amount_paid_usd,
                payment_method=occ.payment_method,
                notes=occ.notes,
                room_number=occ.room.number if occ.room else None,
                guest_name=occ.guest.full_name if occ.guest else None,
                is_active=occ.check_out is None,
                duration_hours=round(duration_hours, 2) if duration_hours else None,
            )
        )

    return results


@router.get(
    "/active",
    response_model=List[OccupancyResponse],
    dependencies=[Depends(require_roles("admin", "gerente", "recepcionista"))],
    summary="Listar ocupaciones activas",
)
def list_active_occupancies(db: Session = Depends(get_db)):
    """
    Lista todas las ocupaciones activas (huéspedes actualmente en el hostal).

    Útil para ver qué habitaciones están ocupadas y quién está hospedado.
    """
    occupancies = (
        db.query(Occupancy)
        .filter(Occupancy.check_out.is_(None))
        .order_by(Occupancy.check_in.desc())
        .all()
    )

    results = []
    for occ in occupancies:
        results.append(
            OccupancyResponse(
                id=occ.id,
                room_id=occ.room_id,
                guest_id=occ.guest_id,
                reservation_id=occ.reservation_id,
                check_in=occ.check_in.isoformat(),
                check_out=None,
                amount_paid_bs=occ.amount_paid_bs,
                amount_paid_usd=occ.amount_paid_usd,
                payment_method=occ.payment_method,
                notes=occ.notes,
                room_number=occ.room.number if occ.room else None,
                guest_name=occ.guest.full_name if occ.guest else None,
                is_active=True,
                duration_hours=None,
            )
        )

    return results


@router.get(
    "/{occupancy_id}",
    response_model=OccupancyResponse,
    dependencies=[Depends(require_roles("admin", "gerente", "recepcionista"))],
    summary="Obtener ocupación por ID",
)
def get_occupancy(occupancy_id: int, db: Session = Depends(get_db)):
    """Obtiene la información detallada de una ocupación."""
    occupancy = db.get(Occupancy, occupancy_id)
    if not occupancy:
        raise HTTPException(status_code=404, detail="Ocupación no encontrada")

    duration_hours = None
    if occupancy.check_out:
        duration_hours = (occupancy.check_out - occupancy.check_in).total_seconds() / 3600

    return OccupancyResponse(
        id=occupancy.id,
        room_id=occupancy.room_id,
        guest_id=occupancy.guest_id,
        reservation_id=occupancy.reservation_id,
        check_in=occupancy.check_in.isoformat(),
        check_out=occupancy.check_out.isoformat() if occupancy.check_out else None,
        amount_paid_bs=occupancy.amount_paid_bs,
        amount_paid_usd=occupancy.amount_paid_usd,
        payment_method=occupancy.payment_method,
        notes=occupancy.notes,
        room_number=occupancy.room.number if occupancy.room else None,
        guest_name=occupancy.guest.full_name if occupancy.guest else None,
        is_active=occupancy.check_out is None,
        duration_hours=round(duration_hours, 2) if duration_hours else None,
    )


@router.get(
    "/stats/summary",
    dependencies=[Depends(require_roles("admin", "gerente", "recepcionista"))],
    summary="Estadísticas de ocupación",
)
def get_occupancy_stats(db: Session = Depends(get_db)):
    """
    Obtiene estadísticas resumidas de ocupación.

    - Total de ocupaciones
    - Ocupaciones activas (check-ins sin check-out)
    - Habitaciones ocupadas
    - Ingresos totales (Bs y USD)
    """
    total = db.query(func.count(Occupancy.id)).scalar()

    active_count = (
        db.query(func.count(Occupancy.id))
        .filter(Occupancy.check_out.is_(None))
        .scalar()
    )

    # Ingresos totales
    total_bs = (
        db.query(func.sum(Occupancy.amount_paid_bs))
        .filter(Occupancy.amount_paid_bs.isnot(None))
        .scalar()
        or 0
    )

    total_usd = (
        db.query(func.sum(Occupancy.amount_paid_usd))
        .filter(Occupancy.amount_paid_usd.isnot(None))
        .scalar()
        or 0
    )

    # Habitaciones únicas ocupadas actualmente
    occupied_rooms = (
        db.query(func.count(func.distinct(Occupancy.room_id)))
        .filter(Occupancy.check_out.is_(None))
        .scalar()
    )

    return {
        "total_occupancies": total,
        "active_occupancies": active_count,
        "occupied_rooms": occupied_rooms,
        "revenue": {
            "total_bs": round(total_bs, 2),
            "total_usd": round(total_usd, 2),
        },
    }


@router.delete(
    "/{occupancy_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles("admin"))],
    summary="Eliminar ocupación",
)
def delete_occupancy(
    occupancy_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Elimina una ocupación del sistema.

    Requiere rol: admin

    NOTA: Solo eliminar en casos de error. Normalmente usar check-out.
    """
    occupancy = db.get(Occupancy, occupancy_id)
    if not occupancy:
        raise HTTPException(status_code=404, detail="Ocupación no encontrada")

    # Si la ocupación está activa, liberar la habitación
    if not occupancy.check_out:
        room = db.get(Room, occupancy.room_id)
        if room and room.status == RoomStatus.occupied:
            room.status = RoomStatus.available

    db.delete(occupancy)
    db.commit()

    return None
