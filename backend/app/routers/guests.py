from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List
from ..core.db import get_db
from ..core.security import require_roles, get_current_user
from ..models.guest import Guest
from ..schemas.guest import GuestCreate, GuestUpdate, GuestOut

router = APIRouter(prefix="/guests", tags=["guests"])

# Listar (admin y recepcionista), con búsqueda/paginación
@router.get("/", response_model=List[GuestOut],
            dependencies=[Depends(require_roles("admin","recepcionista"))])
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

# Obtener uno (admin y recepcionista)
@router.get("/{guest_id}", response_model=GuestOut,
            dependencies=[Depends(require_roles("admin","recepcionista"))])
def get_guest(guest_id: int, db: Session = Depends(get_db)):
    guest = db.get(Guest, guest_id)
    if not guest:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guest not found")
    return guest

# Crear (admin y recepcionista)
@router.post("/", response_model=GuestOut,
             status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(require_roles("admin","recepcionista"))])
def create_guest(data: GuestCreate, db: Session = Depends(get_db)):
    # opcional: validar duplicados por documento
    exists = db.query(Guest).filter(Guest.document_id == data.document_id).first()
    if exists:
        raise HTTPException(status_code=400, detail="document_id already exists")
    guest = Guest(**data.model_dump())
    db.add(guest)
    db.commit()
    db.refresh(guest)
    return guest

# Actualizar (admin y recepcionista)
@router.patch("/{guest_id}", response_model=GuestOut,
              dependencies=[Depends(require_roles("admin","recepcionista"))])
def update_guest(guest_id: int, data: GuestUpdate, db: Session = Depends(get_db)):
    guest = db.get(Guest, guest_id)
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(guest, k, v)
    db.commit()
    db.refresh(guest)
    return guest

# Eliminar (solo admin)
@router.delete("/{guest_id}", status_code=status.HTTP_204_NO_CONTENT,
               dependencies=[Depends(require_roles("admin"))])
def delete_guest(guest_id: int, db: Session = Depends(get_db)):
    guest = db.get(Guest, guest_id)
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")
    db.delete(guest)
    db.commit()
    return
