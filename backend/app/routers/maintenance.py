# app/routers/maintenance.py
"""Endpoints para gestión de mantenimiento de habitaciones."""
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..core.security import get_current_user, require_roles
from ..models.maintenance import Maintenance, MaintenancePriority, MaintenanceStatus, MaintenanceType
from ..models.room import Room, RoomStatus
from ..models.staff import Staff
from ..models.user import User

router = APIRouter(prefix="/maintenance", tags=["Maintenance"])


# Schemas
class MaintenanceBase(BaseModel):
    room_id: int
    type: MaintenanceType
    priority: MaintenancePriority
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    assigned_to: int | None = None
    estimated_cost: float | None = Field(None, ge=0)


class MaintenanceCreate(MaintenanceBase):
    pass


class MaintenanceUpdate(BaseModel):
    type: MaintenanceType | None = None
    priority: MaintenancePriority | None = None
    status: MaintenanceStatus | None = None
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    assigned_to: int | None = None
    estimated_cost: float | None = Field(None, ge=0)
    actual_cost: float | None = Field(None, ge=0)
    notes: str | None = None


class MaintenanceResponse(BaseModel):
    id: int
    room_id: int
    type: str
    priority: str
    status: str
    title: str
    description: str | None
    notes: str | None
    assigned_to: int | None
    reported_at: str
    started_at: str | None
    completed_at: str | None
    estimated_cost: float | None
    actual_cost: float | None

    # Información relacionada
    room_number: str | None = None
    assigned_staff_name: str | None = None
    duration_hours: float | None = None

    class Config:
        from_attributes = True


# Endpoints
@router.post(
    "/",
    response_model=MaintenanceResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("admin", "gerente", "recepcionista", "mantenimiento"))],
    summary="Crear tarea de mantenimiento",
)
def create_maintenance(
    maintenance_data: MaintenanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Crea una nueva tarea de mantenimiento.

    - Verifica que la habitación exista
    - Verifica que el empleado asignado exista (si se proporciona)
    - Si la prioridad es 'critical', marca la habitación como 'out_of_service'
    """
    # Verificar que la habitación existe
    room = db.get(Room, maintenance_data.room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Habitación no encontrada")

    # Verificar empleado asignado si se proporciona
    if maintenance_data.assigned_to:
        staff = db.get(Staff, maintenance_data.assigned_to)
        if not staff:
            raise HTTPException(status_code=404, detail="Empleado no encontrado")

    # Crear tarea de mantenimiento
    maintenance = Maintenance(**maintenance_data.model_dump())

    # Si es crítico, marcar habitación fuera de servicio
    if maintenance_data.priority == MaintenancePriority.critical:
        room.status = RoomStatus.out_of_service
    elif room.status == RoomStatus.available:
        room.status = RoomStatus.maintenance

    db.add(maintenance)
    db.commit()
    db.refresh(maintenance)

    return MaintenanceResponse(
        id=maintenance.id,
        room_id=maintenance.room_id,
        type=maintenance.type.value,
        priority=maintenance.priority.value,
        status=maintenance.status.value,
        title=maintenance.title,
        description=maintenance.description,
        notes=maintenance.notes,
        assigned_to=maintenance.assigned_to,
        reported_at=maintenance.reported_at.isoformat(),
        started_at=maintenance.started_at.isoformat() if maintenance.started_at else None,
        completed_at=maintenance.completed_at.isoformat() if maintenance.completed_at else None,
        estimated_cost=maintenance.estimated_cost,
        actual_cost=maintenance.actual_cost,
        room_number=room.number,
        assigned_staff_name=None,
        duration_hours=None,
    )


@router.get(
    "/",
    response_model=List[MaintenanceResponse],
    dependencies=[Depends(require_roles("admin", "gerente", "recepcionista", "mantenimiento"))],
    summary="Listar tareas de mantenimiento",
)
def list_maintenance(
    room_id: int | None = None,
    type: MaintenanceType | None = None,
    priority: MaintenancePriority | None = None,
    status: MaintenanceStatus | None = None,
    assigned_to: int | None = None,
    pending_only: bool = Query(False, description="Solo tareas pendientes o en progreso"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Lista las tareas de mantenimiento con filtros opcionales.

    - **room_id**: Filtrar por habitación
    - **type**: Filtrar por tipo de mantenimiento
    - **priority**: Filtrar por prioridad
    - **status**: Filtrar por estado
    - **assigned_to**: Filtrar por empleado asignado
    - **pending_only**: Solo tareas pendientes o en progreso
    """
    query = db.query(Maintenance)

    if room_id:
        query = query.filter(Maintenance.room_id == room_id)
    if type:
        query = query.filter(Maintenance.type == type)
    if priority:
        query = query.filter(Maintenance.priority == priority)
    if status:
        query = query.filter(Maintenance.status == status)
    if assigned_to:
        query = query.filter(Maintenance.assigned_to == assigned_to)
    if pending_only:
        query = query.filter(
            Maintenance.status.in_([MaintenanceStatus.pending, MaintenanceStatus.in_progress])
        )

    # Ordenar por prioridad y fecha
    priority_order = {
        MaintenancePriority.critical: 0,
        MaintenancePriority.high: 1,
        MaintenancePriority.medium: 2,
        MaintenancePriority.low: 3,
    }

    query = query.order_by(Maintenance.reported_at.desc())
    maintenances = query.offset(skip).limit(limit).all()

    # Ordenar por prioridad en Python (más fácil que en SQL)
    maintenances.sort(key=lambda m: (priority_order.get(m.priority, 99), m.reported_at), reverse=True)

    results = []
    for m in maintenances:
        duration_hours = None
        if m.started_at and m.completed_at:
            duration_hours = (m.completed_at - m.started_at).total_seconds() / 3600

        results.append(
            MaintenanceResponse(
                id=m.id,
                room_id=m.room_id,
                type=m.type.value,
                priority=m.priority.value,
                status=m.status.value,
                title=m.title,
                description=m.description,
                notes=m.notes,
                assigned_to=m.assigned_to,
                reported_at=m.reported_at.isoformat(),
                started_at=m.started_at.isoformat() if m.started_at else None,
                completed_at=m.completed_at.isoformat() if m.completed_at else None,
                estimated_cost=m.estimated_cost,
                actual_cost=m.actual_cost,
                room_number=m.room.number if m.room else None,
                assigned_staff_name=None,
                duration_hours=round(duration_hours, 2) if duration_hours else None,
            )
        )

    return results


@router.get(
    "/{maintenance_id}",
    response_model=MaintenanceResponse,
    dependencies=[Depends(require_roles("admin", "gerente", "recepcionista", "mantenimiento"))],
    summary="Obtener tarea de mantenimiento por ID",
)
def get_maintenance(maintenance_id: int, db: Session = Depends(get_db)):
    """Obtiene la información detallada de una tarea de mantenimiento."""
    maintenance = db.get(Maintenance, maintenance_id)
    if not maintenance:
        raise HTTPException(status_code=404, detail="Tarea de mantenimiento no encontrada")

    duration_hours = None
    if maintenance.started_at and maintenance.completed_at:
        duration_hours = (maintenance.completed_at - maintenance.started_at).total_seconds() / 3600

    return MaintenanceResponse(
        id=maintenance.id,
        room_id=maintenance.room_id,
        type=maintenance.type.value,
        priority=maintenance.priority.value,
        status=maintenance.status.value,
        title=maintenance.title,
        description=maintenance.description,
        notes=maintenance.notes,
        assigned_to=maintenance.assigned_to,
        reported_at=maintenance.reported_at.isoformat(),
        started_at=maintenance.started_at.isoformat() if maintenance.started_at else None,
        completed_at=maintenance.completed_at.isoformat() if maintenance.completed_at else None,
        estimated_cost=maintenance.estimated_cost,
        actual_cost=maintenance.actual_cost,
        room_number=maintenance.room.number if maintenance.room else None,
        assigned_staff_name=None,
        duration_hours=round(duration_hours, 2) if duration_hours else None,
    )


@router.patch(
    "/{maintenance_id}",
    response_model=MaintenanceResponse,
    dependencies=[Depends(require_roles("admin", "gerente", "mantenimiento"))],
    summary="Actualizar tarea de mantenimiento",
)
def update_maintenance(
    maintenance_id: int,
    maintenance_update: MaintenanceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Actualiza una tarea de mantenimiento.

    - Puede cambiar estado, prioridad, asignación, etc.
    - Actualiza automáticamente started_at y completed_at según el estado
    """
    maintenance = db.get(Maintenance, maintenance_id)
    if not maintenance:
        raise HTTPException(status_code=404, detail="Tarea de mantenimiento no encontrada")

    # Verificar empleado asignado si se cambia
    if maintenance_update.assigned_to:
        staff = db.get(Staff, maintenance_update.assigned_to)
        if not staff:
            raise HTTPException(status_code=404, detail="Empleado no encontrado")

    # Actualizar campos
    update_data = maintenance_update.model_dump(exclude_unset=True)

    # Manejar cambios de estado
    if "status" in update_data:
        new_status = update_data["status"]

        # Si cambia a 'in_progress' y no tiene started_at, establecerlo
        if new_status == MaintenanceStatus.in_progress and not maintenance.started_at:
            maintenance.started_at = datetime.utcnow()

        # Si cambia a 'completed' y no tiene completed_at, establecerlo
        if new_status == MaintenanceStatus.completed and not maintenance.completed_at:
            maintenance.completed_at = datetime.utcnow()

            # Actualizar estado de la habitación a 'available' o 'cleaning'
            room = db.get(Room, maintenance.room_id)
            if room and room.status in [RoomStatus.maintenance, RoomStatus.out_of_service]:
                room.status = RoomStatus.cleaning

        # Si cambia a 'cancelled', actualizar habitación si corresponde
        if new_status == MaintenanceStatus.cancelled:
            room = db.get(Room, maintenance.room_id)
            if room and room.status in [RoomStatus.maintenance, RoomStatus.out_of_service]:
                room.status = RoomStatus.available

    for field, value in update_data.items():
        setattr(maintenance, field, value)

    db.commit()
    db.refresh(maintenance)

    duration_hours = None
    if maintenance.started_at and maintenance.completed_at:
        duration_hours = (maintenance.completed_at - maintenance.started_at).total_seconds() / 3600

    # Get assigned staff name if assigned_to is set
    assigned_staff_name = None
    if maintenance.assigned_to:
        staff = db.get(Staff, maintenance.assigned_to)
        if staff:
            assigned_staff_name = staff.full_name

    return MaintenanceResponse(
        id=maintenance.id,
        room_id=maintenance.room_id,
        type=maintenance.type.value,
        priority=maintenance.priority.value,
        status=maintenance.status.value,
        title=maintenance.title,
        description=maintenance.description,
        notes=maintenance.notes,
        assigned_to=maintenance.assigned_to,
        reported_at=maintenance.reported_at.isoformat(),
        started_at=maintenance.started_at.isoformat() if maintenance.started_at else None,
        completed_at=maintenance.completed_at.isoformat() if maintenance.completed_at else None,
        estimated_cost=maintenance.estimated_cost,
        actual_cost=maintenance.actual_cost,
        room_number=maintenance.room.number if maintenance.room else None,
        assigned_staff_name=assigned_staff_name,
        duration_hours=round(duration_hours, 2) if duration_hours else None,
    )


@router.post(
    "/{maintenance_id}/start",
    response_model=MaintenanceResponse,
    dependencies=[Depends(require_roles("admin", "gerente", "mantenimiento"))],
    summary="Iniciar tarea de mantenimiento",
)
def start_maintenance(
    maintenance_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Marca una tarea de mantenimiento como 'in_progress'.

    - Establece started_at a la fecha/hora actual
    - Cambia el estado a 'in_progress'
    """
    maintenance = db.get(Maintenance, maintenance_id)
    if not maintenance:
        raise HTTPException(status_code=404, detail="Tarea de mantenimiento no encontrada")

    if maintenance.status != MaintenanceStatus.pending:
        raise HTTPException(
            status_code=400,
            detail=f"La tarea ya está en estado '{maintenance.status.value}'",
        )

    maintenance.status = MaintenanceStatus.in_progress
    maintenance.started_at = datetime.utcnow()

    db.commit()
    db.refresh(maintenance)

    return MaintenanceResponse(
        id=maintenance.id,
        room_id=maintenance.room_id,
        type=maintenance.type.value,
        priority=maintenance.priority.value,
        status=maintenance.status.value,
        title=maintenance.title,
        description=maintenance.description,
        notes=maintenance.notes,
        assigned_to=maintenance.assigned_to,
        reported_at=maintenance.reported_at.isoformat(),
        started_at=maintenance.started_at.isoformat(),
        completed_at=None,
        estimated_cost=maintenance.estimated_cost,
        actual_cost=maintenance.actual_cost,
        room_number=maintenance.room.number if maintenance.room else None,
        assigned_staff_name=None,
        duration_hours=None,
    )


@router.post(
    "/{maintenance_id}/pause",
    response_model=MaintenanceResponse,
    dependencies=[Depends(require_roles("admin", "gerente", "mantenimiento"))],
    summary="Pausar tarea de mantenimiento",
)
def pause_maintenance(
    maintenance_id: int,
    notes: str | None = Query(None, description="Razón de la pausa"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Pausa una tarea de mantenimiento en progreso.

    - Cambia el estado a 'cancelled' para marcar como pausada
    - Permite reanudar después
    """
    maintenance = db.get(Maintenance, maintenance_id)
    if not maintenance:
        raise HTTPException(status_code=404, detail="Tarea de mantenimiento no encontrada")

    if maintenance.status not in [MaintenanceStatus.in_progress, MaintenanceStatus.pending]:
        raise HTTPException(
            status_code=400,
            detail=f"La tarea debe estar en progreso o pendiente para ser pausada. Estado actual: '{maintenance.status.value}'",
        )

    maintenance.status = MaintenanceStatus.cancelled

    if notes:
        current_notes = maintenance.notes or ""
        maintenance.notes = f"{current_notes}\n[Pausada] {notes}".strip()

    db.commit()
    db.refresh(maintenance)

    duration_hours = None
    if maintenance.started_at and maintenance.completed_at:
        duration_hours = (maintenance.completed_at - maintenance.started_at).total_seconds() / 3600

    return MaintenanceResponse(
        id=maintenance.id,
        room_id=maintenance.room_id,
        type=maintenance.type.value,
        priority=maintenance.priority.value,
        status=maintenance.status.value,
        title=maintenance.title,
        description=maintenance.description,
        notes=maintenance.notes,
        assigned_to=maintenance.assigned_to,
        reported_at=maintenance.reported_at.isoformat(),
        started_at=maintenance.started_at.isoformat() if maintenance.started_at else None,
        completed_at=maintenance.completed_at.isoformat() if maintenance.completed_at else None,
        estimated_cost=maintenance.estimated_cost,
        actual_cost=maintenance.actual_cost,
        room_number=maintenance.room.number if maintenance.room else None,
        assigned_staff_name=None,
        duration_hours=round(duration_hours, 2) if duration_hours else None,
    )


@router.post(
    "/{maintenance_id}/resume",
    response_model=MaintenanceResponse,
    dependencies=[Depends(require_roles("admin", "gerente", "mantenimiento"))],
    summary="Reanudar tarea de mantenimiento pausada",
)
def resume_maintenance(
    maintenance_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Reanuda una tarea de mantenimiento que estaba pausada.

    - Cambia el estado de 'cancelled' de vuelta a 'pending'
    """
    maintenance = db.get(Maintenance, maintenance_id)
    if not maintenance:
        raise HTTPException(status_code=404, detail="Tarea de mantenimiento no encontrada")

    if maintenance.status != MaintenanceStatus.cancelled:
        raise HTTPException(
            status_code=400,
            detail=f"Solo tareas pausadas pueden ser reanudadas. Estado actual: '{maintenance.status.value}'",
        )

    maintenance.status = MaintenanceStatus.pending
    db.commit()
    db.refresh(maintenance)

    duration_hours = None
    if maintenance.started_at and maintenance.completed_at:
        duration_hours = (maintenance.completed_at - maintenance.started_at).total_seconds() / 3600

    return MaintenanceResponse(
        id=maintenance.id,
        room_id=maintenance.room_id,
        type=maintenance.type.value,
        priority=maintenance.priority.value,
        status=maintenance.status.value,
        title=maintenance.title,
        description=maintenance.description,
        notes=maintenance.notes,
        estimated_cost=maintenance.estimated_cost,
        actual_cost=maintenance.actual_cost,
        reported_at=maintenance.reported_at,
        started_at=maintenance.started_at,
        completed_at=maintenance.completed_at,
        assigned_staff_name=None,
        duration_hours=round(duration_hours, 2) if duration_hours else None,
    )


@router.post(
    "/{maintenance_id}/complete",
    response_model=MaintenanceResponse,
    dependencies=[Depends(require_roles("admin", "gerente", "mantenimiento"))],
    summary="Completar tarea de mantenimiento",
)
def complete_maintenance(
    maintenance_id: int,
    actual_cost: float | None = Query(None, ge=0, description="Costo real del mantenimiento"),
    notes: str | None = Query(None, description="Notas adicionales"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Marca una tarea de mantenimiento como 'completed'.

    - Establece completed_at a la fecha/hora actual
    - Cambia el estado a 'completed'
    - Opcionalmente registra el costo real
    - Cambia el estado de la habitación a 'cleaning'
    """
    maintenance = db.get(Maintenance, maintenance_id)
    if not maintenance:
        raise HTTPException(status_code=404, detail="Tarea de mantenimiento no encontrada")

    if maintenance.status == MaintenanceStatus.completed:
        raise HTTPException(status_code=400, detail="La tarea ya está completada")

    if maintenance.status == MaintenanceStatus.cancelled:
        raise HTTPException(status_code=400, detail="La tarea está cancelada")

    maintenance.status = MaintenanceStatus.completed
    maintenance.completed_at = datetime.utcnow()

    if actual_cost is not None:
        maintenance.actual_cost = actual_cost

    if notes:
        current_notes = maintenance.notes or ""
        maintenance.notes = f"{current_notes}\n[Completado] {notes}".strip()

    # Si no se había iniciado, establecer started_at
    if not maintenance.started_at:
        maintenance.started_at = maintenance.reported_at

    # Actualizar estado de la habitación
    room = db.get(Room, maintenance.room_id)
    if room and room.status in [RoomStatus.maintenance, RoomStatus.out_of_service]:
        room.status = RoomStatus.cleaning

    db.commit()
    db.refresh(maintenance)

    duration_hours = None
    if maintenance.started_at and maintenance.completed_at:
        duration_hours = (maintenance.completed_at - maintenance.started_at).total_seconds() / 3600

    return MaintenanceResponse(
        id=maintenance.id,
        room_id=maintenance.room_id,
        type=maintenance.type.value,
        priority=maintenance.priority.value,
        status=maintenance.status.value,
        title=maintenance.title,
        description=maintenance.description,
        notes=maintenance.notes,
        assigned_to=maintenance.assigned_to,
        reported_at=maintenance.reported_at.isoformat(),
        started_at=maintenance.started_at.isoformat() if maintenance.started_at else None,
        completed_at=maintenance.completed_at.isoformat(),
        estimated_cost=maintenance.estimated_cost,
        actual_cost=maintenance.actual_cost,
        room_number=room.number if room else None,
        assigned_staff_name=None,
        duration_hours=round(duration_hours, 2) if duration_hours else None,
    )


@router.get(
    "/stats/summary",
    dependencies=[Depends(require_roles("admin", "gerente"))],
    summary="Estadísticas de mantenimiento",
)
def get_maintenance_stats(db: Session = Depends(get_db)):
    """
    Obtiene estadísticas resumidas de mantenimiento.

    - Total de tareas por estado
    - Total de tareas por prioridad
    - Tareas pendientes
    - Costos totales (estimado vs real)
    """
    total = db.query(func.count(Maintenance.id)).scalar()

    # Por estado
    by_status = (
        db.query(Maintenance.status, func.count(Maintenance.id))
        .group_by(Maintenance.status)
        .all()
    )

    # Por prioridad
    by_priority = (
        db.query(Maintenance.priority, func.count(Maintenance.id))
        .group_by(Maintenance.priority)
        .all()
    )

    # Pendientes (pending + in_progress)
    pending = (
        db.query(func.count(Maintenance.id))
        .filter(Maintenance.status.in_([MaintenanceStatus.pending, MaintenanceStatus.in_progress]))
        .scalar()
    )

    # Costos
    total_estimated = (
        db.query(func.coalesce(func.sum(Maintenance.estimated_cost), 0.0)).scalar()
    )
    total_actual = (
        db.query(func.coalesce(func.sum(Maintenance.actual_cost), 0.0))
        .filter(Maintenance.status == MaintenanceStatus.completed)
        .scalar()
    )

    return {
        "total": total,
        "pending": pending,
        "by_status": {str(status.value): count for status, count in by_status},
        "by_priority": {str(priority.value): count for priority, count in by_priority},
        "costs": {
            "total_estimated": float(total_estimated),
            "total_actual": float(total_actual),
        },
    }


@router.delete(
    "/{maintenance_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles("admin"))],
    summary="Eliminar tarea de mantenimiento",
)
def delete_maintenance(
    maintenance_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Elimina una tarea de mantenimiento del sistema.

    Requiere rol: admin

    NOTA: Considerar cambiar status a 'cancelled' en lugar de eliminar.
    """
    maintenance = db.get(Maintenance, maintenance_id)
    if not maintenance:
        raise HTTPException(status_code=404, detail="Tarea de mantenimiento no encontrada")

    # Si la tarea no está completada, restaurar habitación
    if maintenance.status != MaintenanceStatus.completed:
        room = db.get(Room, maintenance.room_id)
        if room and room.status in [RoomStatus.maintenance, RoomStatus.out_of_service]:
            room.status = RoomStatus.available

    db.delete(maintenance)
    db.commit()

    return None
