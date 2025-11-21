# app/core/audit.py
"""
Sistema de auditoría para registrar operaciones críticas.
Utiliza structlog para logs estructurados y base de datos para consultas por admin.
"""
import json
import structlog
from typing import Any, Optional
from datetime import datetime

from ..models.user import User

# Logger específico para auditoría
audit_log = structlog.get_logger("audit")

# Variable global para la sesión de BD (se inyecta desde los endpoints)
_db_session = None


def set_audit_db_session(db):
    """Establece la sesión de BD para auditoría"""
    global _db_session
    _db_session = db


def log_action(
    action: str,
    resource_type: str,
    resource_id: Optional[int] = None,
    user: Optional[User] = None,
    details: Optional[dict[str, Any]] = None,
    success: bool = True,
    ip_address: Optional[str] = None,
):
    """
    Registra una acción de auditoría en structlog y base de datos.

    Args:
        action: Acción realizada (create, update, delete, login, etc.)
        resource_type: Tipo de recurso afectado (user, guest, room, reservation, etc.)
        resource_id: ID del recurso afectado
        user: Usuario que realizó la acción
        details: Detalles adicionales de la operación
        success: Si la operación fue exitosa
        ip_address: IP del cliente
    """
    log_data = {
        "action": action,
        "resource_type": resource_type,
        "success": success,
    }

    if resource_id:
        log_data["resource_id"] = resource_id

    if user:
        log_data["user_id"] = user.id
        log_data["user_email"] = user.email
        log_data["user_role"] = user.role

    if details:
        log_data["details"] = details

    if ip_address:
        log_data["ip_address"] = ip_address

    # Log a structlog (para logs estructurados)
    audit_log.info("Audit event", **log_data)

    # Guardar en base de datos (para consultas por admin)
    try:
        if _db_session:
            from ..models.audit_log import AuditLog

            audit_record = AuditLog(
                timestamp=datetime.utcnow(),
                user_id=user.id if user else None,
                user_email=user.email if user else None,
                user_role=user.role if user else None,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                description=f"{action} on {resource_type}" + (f"/{resource_id}" if resource_id else ""),
                details=json.dumps(details) if details else None,
                success=success,
                ip_address=ip_address,
            )
            _db_session.add(audit_record)
            _db_session.commit()
    except Exception as e:
        # No fallar la operación principal si hay error en auditoría
        audit_log.error("Failed to save audit log to database", error=str(e))


# Funciones de conveniencia para operaciones comunes
def log_create(resource_type: str, resource_id: int, user: User, details: Optional[dict] = None):
    """Log de creación de recurso."""
    log_action("create", resource_type, resource_id, user, details)


def log_update(resource_type: str, resource_id: int, user: User, details: Optional[dict] = None):
    """Log de actualización de recurso."""
    log_action("update", resource_type, resource_id, user, details)


def log_delete(resource_type: str, resource_id: int, user: User, details: Optional[dict] = None):
    """Log de eliminación de recurso."""
    log_action("delete", resource_type, resource_id, user, details)


def log_login(user_email: str, success: bool, details: Optional[dict] = None):
    """Log de intento de login."""
    log_action("login", "user", user=None, details={"email": user_email, **(details or {})}, success=success)


def log_status_change(
    resource_type: str,
    resource_id: int,
    old_status: str,
    new_status: str,
    user: User,
):
    """Log de cambio de estado."""
    log_action(
        "status_change",
        resource_type,
        resource_id,
        user,
        details={"old_status": old_status, "new_status": new_status},
    )
