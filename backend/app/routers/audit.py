# app/routers/audit.py
"""
Router para acceso a logs de auditoría.
SEGURIDAD: Solo el administrador puede acceder a estos endpoints.
"""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.audit import AuditLogOut, AuditSummary

router = APIRouter(prefix="/audit", tags=["Audit"])


@router.get("/logs", response_model=list[AuditLogOut])
def get_audit_logs(
    # Filtros
    user_id: int = Query(None, description="Filtrar por ID de usuario"),
    user_email: str = Query(None, description="Filtrar por email de usuario"),
    action: str = Query(None, description="Filtrar por acción (login, create, update, delete, etc.)"),
    resource_type: str = Query(None, description="Filtrar por tipo de recurso (user, guest, room, etc.)"),
    resource_id: int = Query(None, description="Filtrar por ID de recurso"),
    success: bool = Query(None, description="Filtrar por éxito/fallo"),
    # Rango de fechas
    start_date: datetime = Query(None, description="Fecha de inicio (ISO format)"),
    end_date: datetime = Query(None, description="Fecha de fin (ISO format)"),
    # Paginación
    limit: int = Query(100, ge=1, le=1000, description="Cantidad de resultados (máx 1000)"),
    offset: int = Query(0, ge=0, description="Desplazamiento para paginación"),
    # User actual
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Obtiene logs de auditoría del sistema.
    SOLO ADMIN PUEDE ACCEDER.

    Parámetros:
    - user_id: Filtrar por usuario específico
    - user_email: Filtrar por email del usuario
    - action: Filtrar por tipo de acción
    - resource_type: Filtrar por tipo de recurso afectado
    - resource_id: Filtrar por ID de recurso
    - success: Filtrar por estado (true=exitoso, false=fallido)
    - start_date: Desde fecha
    - end_date: Hasta fecha
    - limit: Cantidad máxima de resultados
    - offset: Para paginación
    """
    # SEGURIDAD: Solo admin puede ver los logs
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden ver los logs de auditoría",
        )

    # Construir query
    query = db.query(AuditLog)

    # Aplicar filtros
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)

    if user_email:
        query = query.filter(AuditLog.user_email.ilike(f"%{user_email}%"))

    if action:
        query = query.filter(AuditLog.action == action)

    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type)

    if resource_id:
        query = query.filter(AuditLog.resource_id == resource_id)

    if success is not None:
        query = query.filter(AuditLog.success == success)

    if start_date:
        query = query.filter(AuditLog.timestamp >= start_date)

    if end_date:
        query = query.filter(AuditLog.timestamp <= end_date)

    # Ordenar por fecha descendente y aplicar paginación
    logs = query.order_by(desc(AuditLog.timestamp)).offset(offset).limit(limit).all()

    return logs


@router.get("/logs/user/{user_id}", response_model=list[AuditLogOut])
def get_user_audit_logs(
    user_id: int,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Obtiene todos los logs de auditoría de un usuario específico.
    SOLO ADMIN PUEDE ACCEDER.

    Esto permite rastrear toda la actividad de un usuario desde su creación.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden ver los logs de auditoría",
        )

    logs = (
        db.query(AuditLog)
        .filter(AuditLog.user_id == user_id)
        .order_by(desc(AuditLog.timestamp))
        .offset(offset)
        .limit(limit)
        .all()
    )

    return logs


@router.get("/summary", response_model=list[AuditSummary])
def get_audit_summary(
    days: int = Query(7, ge=1, le=90, description="Últimos N días"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Obtiene resumen de actividad por usuario.
    SOLO ADMIN PUEDE ACCEDER.

    Muestra:
    - Total de acciones por usuario
    - Último acceso
    - Acciones fallidas vs exitosas
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden ver el resumen de auditoría",
        )

    cutoff_date = datetime.utcnow() - timedelta(days=days)

    # Agregación por usuario
    summary = (
        db.query(
            AuditLog.user_id,
            AuditLog.user_email,
            AuditLog.user_role,
            func.count(AuditLog.id).label("total_actions"),
            func.max(AuditLog.timestamp).label("last_action"),
            func.sum(func.cast(~AuditLog.success, db.Integer)).label("failed_actions"),
            func.sum(func.cast(AuditLog.success, db.Integer)).label("successful_actions"),
        )
        .filter(AuditLog.timestamp >= cutoff_date)
        .filter(AuditLog.user_id.isnot(None))
        .group_by(AuditLog.user_id, AuditLog.user_email, AuditLog.user_role)
        .all()
    )

    results = [
        AuditSummary(
            user_id=row.user_id,
            user_email=row.user_email or "Unknown",
            user_role=row.user_role or "Unknown",
            total_actions=row.total_actions or 0,
            last_action=row.last_action,
            failed_actions=row.failed_actions or 0,
            successful_actions=row.successful_actions or 0,
        )
        for row in summary
    ]

    return results


@router.get("/actions", response_model=list[str])
def get_available_actions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Obtiene lista de todas las acciones registradas en el sistema.
    SOLO ADMIN PUEDE ACCEDER.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden ver esta información",
        )

    actions = db.query(AuditLog.action).distinct().order_by(AuditLog.action).all()
    return [action[0] for action in actions if action[0]]


@router.get("/resource-types", response_model=list[str])
def get_available_resource_types(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Obtiene lista de todos los tipos de recursos auditados.
    SOLO ADMIN PUEDE ACCEDER.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden ver esta información",
        )

    types = (
        db.query(AuditLog.resource_type)
        .distinct()
        .order_by(AuditLog.resource_type)
        .all()
    )
    return [t[0] for t in types if t[0]]
