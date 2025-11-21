from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..core.security import require_roles
from ..models.room import Room, RoomType
from ..schemas.room import RoomCreate, RoomOut, RoomUpdate, RoomListResponse
from ..services.currency import CurrencyService

router = APIRouter(prefix="/rooms", tags=["rooms"])


def _convert_price_to_bs(price_amount: float | None, price_currency: str | None, db: Session) -> float | None:
    """Convierte el precio a Bolívares si se proporciona."""
    if price_amount is None or price_currency is None:
        return None

    if price_currency == "VES":
        return price_amount

    # Convertir de USD o EUR a VES
    return CurrencyService.convert_amount(db, price_amount, price_currency, "VES").get("converted_amount")


@router.post(
    "/",
    response_model=RoomOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Crear una nueva habitación",
    description="Crea una nueva habitación en la base de datos. El número de habitación debe ser único.",
)
def create_room(data: RoomCreate, db: Session = Depends(get_db)):
    price_bs = _convert_price_to_bs(data.price_amount, data.price_currency, db)
    room = Room(
        number=data.number,
        type=RoomType(data.type),
        price_bs=price_bs,
        notes=data.notes
    )
    db.add(room)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Room number already exists") from None
    db.refresh(room)
    return room


@router.get(
    "/",
    response_model=list[RoomOut],
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Listar todas las habitaciones",
    description="""
Obtiene una lista de todas las habitaciones, con opciones de paginación y filtrado.

- **q**: Busca por número o notas (búsqueda parcial, insensible a mayúsculas).
- **room_type**: Filtra por tipo de habitación ('single', 'double', 'suite').
""",
)
def list_rooms(
    db: Session = Depends(get_db),
    q: str | None = Query(None, description="Buscar por número o notas"),
    room_type: str | None = Query(None, pattern="^(single|double|suite)$"),
    skip: int = 0,
    limit: int = Query(50, ge=1, le=500),
):
    query = db.query(Room)
    if q:
        like = f"%{q}%"
        query = query.filter((Room.number.ilike(like)) | (Room.notes.ilike(like)))
    if room_type:
        query = query.filter(Room.type == RoomType(room_type))
    return query.order_by(Room.number.asc()).offset(skip).limit(limit).all()


@router.get(
    "/paginated",
    response_model=RoomListResponse,
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Listar habitaciones paginadas",
    description="Devuelve habitaciones con paginación, filtros y ordenamiento para catálogos grandes.",
)
def list_rooms_paginated(
    db: Session = Depends(get_db),
    q: str | None = Query(None, description="Buscar por número o notas"),
    room_type: str | None = Query(None, pattern="^(single|double|suite)$"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    sort_by: str = Query("number", pattern="^(number|type|status|price)$"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$"),
):
    query = db.query(Room)
    if q:
        like = f"%{q}%"
        query = query.filter((Room.number.ilike(like)) | (Room.notes.ilike(like)))
    if room_type:
        query = query.filter(Room.type == RoomType(room_type))

    total = query.count()

    sort_columns = {
        "number": Room.number,
        "type": Room.type,
        "status": Room.status,
        "price": Room.price_bs,
    }
    sort_column = sort_columns.get(sort_by, Room.number)
    order_clause = sort_column.asc() if sort_order == "asc" else sort_column.desc()

    results = (
        query.order_by(order_clause, Room.id.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return RoomListResponse(items=results, total=total)


@router.get(
    "/{room_id}",
    response_model=RoomOut,
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Obtener una habitación por ID",
)
def get_room(room_id: int, db: Session = Depends(get_db)):
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room


@router.patch(
    "/{room_id}",
    response_model=RoomOut,
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Actualizar una habitación",
    description="Actualiza parcialmente los datos de una habitación existente.",
)
def update_room(room_id: int, data: RoomUpdate, db: Session = Depends(get_db)):
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    if data.number is not None:
        room.number = data.number
    if data.type is not None:
        room.type = RoomType(data.type)
    if data.notes is not None:
        room.notes = data.notes
    if data.price_amount is not None or data.price_currency is not None:
        price_bs = _convert_price_to_bs(data.price_amount, data.price_currency, db)
        if price_bs is not None:
            room.price_bs = price_bs

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Room number already exists") from None
    db.refresh(room)
    return room


@router.delete(
    "/{room_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles("admin"))],
    summary="Eliminar una habitación",
)
def delete_room(room_id: int, db: Session = Depends(get_db)):
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    db.delete(room)
    db.commit()
    return None


@router.get(
    "/stats/summary",
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Obtener estadísticas de las habitaciones",
)
def get_room_stats(db: Session = Depends(get_db)):
    """
    Obtiene estadísticas sobre el estado de las habitaciones.
    """
    from sqlalchemy import func

    stats = (
        db.query(Room.status, func.count(Room.id).label("count"))
        .group_by(Room.status)
        .all()
    )
    total = db.query(func.count(Room.id)).scalar()

    # Convert stats to a dictionary for easier access
    stats_dict = {str(status.value): count for status, count in stats}

    return {
        "total": total,
        "available": stats_dict.get("available", 0),
        "occupied": stats_dict.get("occupied", 0),
        "cleaning": stats_dict.get("cleaning", 0),
        "maintenance": stats_dict.get("maintenance", 0),
        "out_of_service": stats_dict.get("out_of_service", 0),
    }
