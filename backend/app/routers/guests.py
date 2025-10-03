from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..core.security import require_roles
from ..models.guest import Guest
from ..schemas.guest import GuestCreate, GuestOut, GuestUpdate

router = APIRouter(prefix="/guests", tags=["guests"])


@router.get(
    "/",
    response_model=List[GuestOut],
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Listar huéspedes",
    description="""
Obtiene una lista paginada de huéspedes.

Permite filtrar por los siguientes parámetros:
- **q**: Búsqueda por nombre completo o documento de identidad.
- **skip**: Número de registros a saltar (para paginación).
- **limit**: Número máximo de registros a devolver.
""",
)
def list_guests(
    q: str | None = Query(None, description="Buscar por nombre o documento"),
    skip: int = 0,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(Guest)
    if q:
        like = f"%{q}%"
        query = query.filter((Guest.full_name.ilike(like)) | (Guest.document_id.ilike(like)))
    return query.order_by(Guest.id).offset(skip).limit(limit).all()


@router.get(
    "/{guest_id}",
    response_model=GuestOut,
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Obtener un huésped por ID",
)
def get_guest(guest_id: int, db: Session = Depends(get_db)):
    """Busca y devuelve un único huésped por su ID."""
    guest = db.get(Guest, guest_id)
    if not guest:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guest not found")
    return guest


@router.post(
    "/",
    response_model=GuestOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Crear un nuevo huésped",
    description="Registra un nuevo huésped en el sistema. El `document_id` debe ser único.",
)
def create_guest(data: GuestCreate, db: Session = Depends(get_db)):
    exists = db.query(Guest).filter(Guest.document_id == data.document_id).first()
    if exists:
        raise HTTPException(status_code=400, detail="document_id already exists")
    guest = Guest(**data.model_dump())
    db.add(guest)
    db.commit()
    db.refresh(guest)
    return guest


@router.patch(
    "/{guest_id}",
    response_model=GuestOut,
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Actualizar un huésped",
    description="Actualiza parcialmente la información de un huésped existente, buscando por su ID.",
)
def update_guest(guest_id: int, data: GuestUpdate, db: Session = Depends(get_db)):
    guest = db.get(Guest, guest_id)
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(guest, k, v)
    db.commit()
    db.refresh(guest)
    return guest


@router.delete(
    "/{guest_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles("admin"))],
    summary="Eliminar un huésped",
    description="Elimina un huésped de la base de datos por su ID. Esta operación es solo para administradores.",
)
def delete_guest(guest_id: int, db: Session = Depends(get_db)):
    guest = db.get(Guest, guest_id)
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")
    db.delete(guest)
    db.commit()
    return
