from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..core.security import require_roles
from ..models.room import Room, RoomType
from ..schemas.room import RoomCreate, RoomOut, RoomUpdate

router = APIRouter(prefix="/rooms", tags=["rooms"])


@router.post(
    "/",
    response_model=RoomOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Crear una nueva habitación",
    description="Crea una nueva habitación en la base de datos. El número de habitación debe ser único.",
)
def create_room(data: RoomCreate, db: Session = Depends(get_db)):
    room = Room(number=data.number, type=RoomType(data.type), notes=data.notes)
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
    limit: int = Query(50, le=200),
):
    query = db.query(Room)
    if q:
        like = f"%{q}%"
        query = query.filter((Room.number.ilike(like)) | (Room.notes.ilike(like)))
    if room_type:
        query = query.filter(Room.type == RoomType(room_type))
    return query.order_by(Room.number.asc()).offset(skip).limit(limit).all()


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
