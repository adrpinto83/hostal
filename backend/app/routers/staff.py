# app/routers/staff.py
"""Endpoints para gestión de personal del hostal."""
from datetime import date
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..core.security import get_current_user, require_roles
from ..models.staff import Staff, StaffRole, StaffStatus
from ..models.user import User

router = APIRouter(prefix="/staff", tags=["Staff"])


# Schemas
class StaffBase(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=255)
    document_id: str = Field(..., min_length=1, max_length=100)
    phone: str | None = Field(None, max_length=50)
    email: str | None = Field(None, max_length=255)
    role: StaffRole
    status: StaffStatus = StaffStatus.active
    hire_date: date | None = None
    salary: float | None = Field(None, ge=0)
    notes: str | None = None


class StaffCreate(StaffBase):
    pass


class StaffUpdate(BaseModel):
    full_name: str | None = Field(None, min_length=1, max_length=255)
    phone: str | None = Field(None, max_length=50)
    email: str | None = Field(None, max_length=255)
    role: StaffRole | None = None
    status: StaffStatus | None = None
    salary: float | None = Field(None, ge=0)
    notes: str | None = None


class StaffResponse(StaffBase):
    id: int
    user_id: int | None = None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


# Endpoints
@router.post(
    "/",
    response_model=StaffResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("admin", "gerente"))],
    summary="Crear nuevo empleado",
)
def create_staff(
    staff_data: StaffCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Crea un nuevo empleado en el sistema.

    Requiere rol: admin o gerente
    """
    # Verificar si ya existe un empleado con ese document_id
    existing = db.query(Staff).filter(Staff.document_id == staff_data.document_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe un empleado con documento {staff_data.document_id}",
        )

    staff = Staff(**staff_data.model_dump())
    db.add(staff)
    db.commit()
    db.refresh(staff)

    return StaffResponse(
        id=staff.id,
        full_name=staff.full_name,
        document_id=staff.document_id,
        phone=staff.phone,
        email=staff.email,
        role=staff.role,
        status=staff.status,
        hire_date=staff.hire_date,
        salary=staff.salary,
        notes=staff.notes,
        user_id=staff.user_id,
        created_at=staff.created_at.isoformat(),
        updated_at=staff.updated_at.isoformat(),
    )


@router.get(
    "/",
    response_model=List[StaffResponse],
    dependencies=[Depends(require_roles("admin", "gerente", "recepcionista"))],
    summary="Listar personal",
)
def list_staff(
    role: StaffRole | None = None,
    status: StaffStatus | None = None,
    search: str | None = Query(None, description="Buscar por nombre o documento"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Lista el personal del hostal con filtros opcionales.

    - **role**: Filtrar por rol (recepcionista, limpieza, mantenimiento, etc.)
    - **status**: Filtrar por estado (active, inactive, on_leave, terminated)
    - **search**: Buscar por nombre o documento
    """
    query = db.query(Staff)

    if role:
        query = query.filter(Staff.role == role)
    if status:
        query = query.filter(Staff.status == status)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Staff.full_name.ilike(search_pattern)) | (Staff.document_id.ilike(search_pattern))
        )

    query = query.order_by(Staff.full_name)
    staff_list = query.offset(skip).limit(limit).all()

    return [
        StaffResponse(
            id=s.id,
            full_name=s.full_name,
            document_id=s.document_id,
            phone=s.phone,
            email=s.email,
            role=s.role,
            status=s.status,
            hire_date=s.hire_date,
            salary=s.salary,
            notes=s.notes,
            user_id=s.user_id,
            created_at=s.created_at.isoformat(),
            updated_at=s.updated_at.isoformat(),
        )
        for s in staff_list
    ]


@router.get(
    "/{staff_id}",
    response_model=StaffResponse,
    dependencies=[Depends(require_roles("admin", "gerente", "recepcionista"))],
    summary="Obtener empleado por ID",
)
def get_staff(staff_id: int, db: Session = Depends(get_db)):
    """Obtiene la información detallada de un empleado."""
    staff = db.get(Staff, staff_id)
    if not staff:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    return StaffResponse(
        id=staff.id,
        full_name=staff.full_name,
        document_id=staff.document_id,
        phone=staff.phone,
        email=staff.email,
        role=staff.role,
        status=staff.status,
        hire_date=staff.hire_date,
        salary=staff.salary,
        notes=staff.notes,
        user_id=staff.user_id,
        created_at=staff.created_at.isoformat(),
        updated_at=staff.updated_at.isoformat(),
    )


@router.patch(
    "/{staff_id}",
    response_model=StaffResponse,
    dependencies=[Depends(require_roles("admin", "gerente"))],
    summary="Actualizar empleado",
)
def update_staff(
    staff_id: int,
    staff_update: StaffUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Actualiza la información de un empleado.

    Requiere rol: admin o gerente
    """
    staff = db.get(Staff, staff_id)
    if not staff:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    # Actualizar solo los campos proporcionados
    update_data = staff_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(staff, field, value)

    db.commit()
    db.refresh(staff)

    return StaffResponse(
        id=staff.id,
        full_name=staff.full_name,
        document_id=staff.document_id,
        phone=staff.phone,
        email=staff.email,
        role=staff.role,
        status=staff.status,
        hire_date=staff.hire_date,
        salary=staff.salary,
        notes=staff.notes,
        user_id=staff.user_id,
        created_at=staff.created_at.isoformat(),
        updated_at=staff.updated_at.isoformat(),
    )


@router.delete(
    "/{staff_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles("admin"))],
    summary="Eliminar empleado",
)
def delete_staff(
    staff_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Elimina un empleado del sistema.

    Requiere rol: admin

    NOTA: Considerar cambiar status a 'terminated' en lugar de eliminar.
    """
    staff = db.get(Staff, staff_id)
    if not staff:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    db.delete(staff)
    db.commit()

    return None


@router.get(
    "/stats/summary",
    dependencies=[Depends(require_roles("admin", "gerente"))],
    summary="Estadísticas del personal",
)
def get_staff_stats(db: Session = Depends(get_db)):
    """
    Obtiene estadísticas resumidas del personal.

    - Total de empleados por rol
    - Total de empleados por estado
    - Empleados activos
    """
    total = db.query(func.count(Staff.id)).scalar()

    # Empleados por estado
    by_status = (
        db.query(Staff.status, func.count(Staff.id))
        .group_by(Staff.status)
        .all()
    )

    # Empleados por rol
    by_role = (
        db.query(Staff.role, func.count(Staff.id))
        .group_by(Staff.role)
        .all()
    )

    # Empleados activos
    active = (
        db.query(func.count(Staff.id))
        .filter(Staff.status == StaffStatus.active)
        .scalar()
    )

    return {
        "total": total,
        "active": active,
        "by_status": {str(status.value): count for status, count in by_status},
        "by_role": {str(role.value): count for role, count in by_role},
    }


@router.post(
    "/{staff_id}/change-status",
    response_model=StaffResponse,
    dependencies=[Depends(require_roles("admin", "gerente"))],
    summary="Cambiar estado del empleado",
)
def change_staff_status(
    staff_id: int,
    new_status: StaffStatus,
    notes: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Cambia el estado de un empleado (active, inactive, on_leave, terminated).

    Útil para:
    - Marcar empleado como de vacaciones (on_leave)
    - Desactivar temporalmente (inactive)
    - Terminar contrato (terminated)
    """
    staff = db.get(Staff, staff_id)
    if not staff:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    staff.status = new_status

    if notes:
        # Agregar nota al historial
        current_notes = staff.notes or ""
        staff.notes = f"{current_notes}\n[{date.today()}] Estado cambiado a {new_status.value}: {notes}".strip()

    db.commit()
    db.refresh(staff)

    return StaffResponse(
        id=staff.id,
        full_name=staff.full_name,
        document_id=staff.document_id,
        phone=staff.phone,
        email=staff.email,
        role=staff.role,
        status=staff.status,
        hire_date=staff.hire_date,
        salary=staff.salary,
        notes=staff.notes,
        user_id=staff.user_id,
        created_at=staff.created_at.isoformat(),
        updated_at=staff.updated_at.isoformat(),
    )


# ============ Endpoints para dispositivos de personal ============

from ..models.device import Device
from ..schemas.device import DeviceCreate, DeviceOut


@router.get(
    "/{staff_id}/devices",
    response_model=List[DeviceOut],
    dependencies=[Depends(require_roles("admin", "gerente", "recepcionista"))],
    summary="Listar dispositivos del personal",
)
def list_staff_devices(staff_id: int, db: Session = Depends(get_db)):
    """Obtiene todos los dispositivos asociados a un miembro del personal."""
    staff = db.get(Staff, staff_id)
    if not staff:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    return staff.devices


@router.post(
    "/{staff_id}/devices",
    response_model=DeviceOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("admin", "gerente"))],
    summary="Registrar dispositivo para personal",
    description="Registra un nuevo dispositivo para un miembro del personal. La dirección MAC debe ser única.",
)
def add_staff_device(
    staff_id: int,
    data: DeviceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Registra un dispositivo para un miembro del personal.

    Los dispositivos del personal:
    - No requieren una ocupancia activa
    - Se suspenden automáticamente si el personal se inactiva
    """
    staff = db.get(Staff, staff_id)
    if not staff:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    mac = data.mac.upper()
    exists = db.query(Device).filter(Device.mac == mac).first()
    if exists:
        raise HTTPException(status_code=400, detail="MAC already registered")

    device = Device(
        staff_id=staff_id,
        mac=mac,
        name=data.name,
        vendor=data.vendor,
        allowed=True
    )
    db.add(device)
    db.commit()
    db.refresh(device)

    try:
        from ..core.network import notify_whitelist_add

        notify_whitelist_add(mac, None, device)
    except Exception:
        pass

    return device


@router.delete(
    "/{staff_id}/devices/{device_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles("admin", "gerente"))],
    summary="Eliminar dispositivo del personal",
)
def delete_staff_device(
    staff_id: int,
    device_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Elimina un dispositivo específico de un miembro del personal."""
    device = db.get(Device, device_id)
    if not device or device.staff_id != staff_id:
        raise HTTPException(status_code=404, detail="Device not found")

    mac = device.mac
    db.delete(device)
    db.commit()

    try:
        from ..core.network import notify_whitelist_remove

        notify_whitelist_remove(mac)
    except Exception:
        pass
    return
