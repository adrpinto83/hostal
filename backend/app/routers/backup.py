# app/routers/backup.py
"""Endpoints para gestión de respaldos y restauración del sistema."""
from fastapi import APIRouter, Depends, HTTPException, status
from starlette.responses import FileResponse
from sqlalchemy.orm import Session
from pathlib import Path

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.backup import BackupService
from app.schemas.backup import (
    BackupCreate,
    BackupOut,
    BackupListOut,
    RestoreRequest,
    RestoreResponse,
    DeleteBackupRequest,
    SystemHealthOut,
    BackupScheduleOut,
    BackupScheduleUpdate,
)
from app.core.audit import log_action

router = APIRouter(prefix="/admin/backup", tags=["Admin - Backup"])


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Verifica que el usuario sea administrador."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden acceder a esta función",
        )
    return current_user


@router.get("/health", response_model=SystemHealthOut)
def system_health(current_user: User = Depends(require_admin)):
    """Obtiene el estado de salud del sistema."""
    try:
        backups = BackupService.list_backups()
        total_size = sum(b["size_bytes"] for b in backups)
        latest = backups[0]["created_at"] if backups else None

        return SystemHealthOut(
            database="online",
            backups_available=len(backups),
            latest_backup=latest,
            total_backup_size_mb=round(total_size / (1024 * 1024), 2),
            timestamp=__import__("datetime").datetime.now().isoformat(),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo estado del sistema: {str(e)}",
        )


@router.post("/create", response_model=BackupOut)
def create_backup(
    request: BackupCreate,
    current_user: User = Depends(require_admin),
):
    """Crea un nuevo respaldo de la base de datos.

    ⚠️ Esta operación puede tomar varios minutos dependiendo del tamaño de la BD.
    """
    try:
        backup_info = BackupService.create_backup(request.description)

        log_action(
            "backup_created",
            "system",
            current_user.id,
            current_user,
            details={
                "backup_id": backup_info["id"],
                "size_mb": backup_info["size_mb"],
                "description": request.description,
            },
        )

        return BackupOut(**backup_info)
    except Exception as e:
        log_action(
            "backup_creation_failed",
            "system",
            current_user.id,
            current_user,
            details={"error": str(e)},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creando respaldo: {str(e)}",
        )


@router.get("/list", response_model=BackupListOut)
def list_backups(current_user: User = Depends(require_admin)):
    """Lista todos los respaldos disponibles."""
    try:
        backups = BackupService.list_backups()
        return BackupListOut(backups=backups, total=len(backups))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listando respaldos: {str(e)}",
        )


@router.get("/database-info")
def get_database_info(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Obtiene información detallada sobre el contenido de la base de datos."""
    try:
        from app.services.backup import BackupService
        info = BackupService.get_database_info(db)

        log_action(
            "database_info_accessed",
            "system",
            current_user.id,
            current_user,
            details={"total_records": info.get("total_records", 0)},
        )

        return info
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo información de la base de datos: {str(e)}",
        )


@router.get("/{backup_id}", response_model=BackupOut)
def get_backup(
    backup_id: str,
    current_user: User = Depends(require_admin),
):
    """Obtiene información de un respaldo específico."""
    try:
        backup = BackupService.get_backup(backup_id)
        if not backup:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Respaldo no encontrado",
            )
        return BackupOut(**backup)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo información del respaldo: {str(e)}",
        )


@router.post("/restore", response_model=RestoreResponse)
def restore_backup(
    request: RestoreRequest,
    current_user: User = Depends(require_admin),
):
    """Restaura la base de datos desde un respaldo.

    ⚠️ ADVERTENCIA: Esta operación ELIMINARÁ todos los datos actuales y los
    reemplazará con los del respaldo. Asegúrate de tener un respaldo reciente
    antes de proceder.

    Requiere confirmación explícita (confirm=true).
    """
    if not request.confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debes confirmar la restauración (confirm=true)",
        )

    try:
        result = BackupService.restore_backup(request.backup_id)

        log_action(
            "database_restored",
            "system",
            current_user.id,
            current_user,
            details={
                "backup_id": request.backup_id,
                "restored_by": current_user.email,
            },
        )

        return RestoreResponse(**result)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Respaldo no encontrado",
        )
    except Exception as e:
        log_action(
            "database_restore_failed",
            "system",
            current_user.id,
            current_user,
            details={
                "backup_id": request.backup_id,
                "error": str(e),
            },
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error restaurando respaldo: {str(e)}",
        )


@router.post("/delete/{backup_id}")
def delete_backup(
    backup_id: str,
    current_user: User = Depends(require_admin),
):
    """Elimina un respaldo.

    ⚠️ ADVERTENCIA: Esta operación es irreversible. Asegúrate de que no
    necesitarás este respaldo en el futuro.
    """
    try:
        result = BackupService.delete_backup(backup_id)

        log_action(
            "backup_deleted",
            "system",
            current_user.id,
            current_user,
            details={
                "backup_id": backup_id,
                "deleted_by": current_user.email,
            },
        )

        return result
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Respaldo no encontrado",
        )
    except Exception as e:
        log_action(
            "backup_deletion_failed",
            "system",
            current_user.id,
            current_user,
            details={
                "backup_id": backup_id,
                "error": str(e),
            },
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error eliminando respaldo: {str(e)}",
        )


@router.get("/download/{backup_id}")
def download_backup(
    backup_id: str,
    current_user: User = Depends(require_admin),
):
    """Descarga un respaldo para almacenamiento externo."""
    try:
        backup_file: Path = BackupService.download_backup(backup_id)
        if not backup_file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Respaldo no encontrado",
            )

        log_action(
            "backup_downloaded",
            "system",
            current_user.id,
            current_user,
            details={"backup_id": backup_id},
        )

        return FileResponse(
            path=backup_file,
            filename=backup_id,
            media_type="application/octet-stream",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error descargando respaldo: {str(e)}",
        )


@router.post("/reset-database")
def reset_database(
    confirm: bool = False,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Resetea la base de datos eliminando todos los datos y dejando solo el usuario admin.

    ⚠️ ADVERTENCIA CRÍTICA: Esta operación eliminará TODOS los datos del sistema de forma PERMANENTE.
    Solo quedará el usuario administrador actual.

    Requiere confirmación explícita (confirm=true).
    """
    if not confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debes confirmar el reseteo (confirm=true)",
        )

    try:
        from app.services.backup import BackupService
        result = BackupService.reset_database(db, keep_admin_user_id=current_user.id)

        log_action(
            "database_reset",
            "system",
            current_user.id,
            current_user,
            details={
                "admin_preserved": current_user.email,
                "records_deleted": result.get("records_deleted", 0),
            },
        )

        return result
    except Exception as e:
        log_action(
            "database_reset_failed",
            "system",
            current_user.id,
            current_user,
            details={"error": str(e)},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error reseteando base de datos: {str(e)}",
        )


@router.post("/generate-test-data")
def generate_test_data(
    count: int = 10,
    force: bool = False,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Genera datos de prueba en la base de datos.

    Args:
        count: Número de registros base a generar (default: 10, max: 500)
        force: Si es True, genera datos incluso si ya existen datos (default: False)

    Genera datos de prueba para:
    - Huéspedes
    - Habitaciones
    - Reservas
    - Pagos
    - Facturas con líneas de factura
    - Staff
    - Dispositivos de red
    - Ocupancias
    - Actividades de red
    - Y más...
    """
    if count < 1 or count > 500:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El número de registros debe estar entre 1 y 500",
        )

    try:
        from app.services.backup import BackupService

        # Verificar si ya existen datos
        db_info = BackupService.get_database_info(db)
        total_records = db_info.get("total_records", 0)
        # Excluir usuarios del conteo (siempre habrá al menos el admin)
        total_records_without_users = total_records - db_info.get("tables", {}).get("users", 0)

        if total_records_without_users > 0 and not force:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "message": "La base de datos ya contiene datos. Usa force=true para generar datos de prueba de todas formas.",
                    "existing_records": total_records,
                    "tables": db_info.get("tables", {}),
                },
            )

        result = BackupService.generate_test_data(db, base_count=count)

        log_action(
            "test_data_generated",
            "system",
            current_user.id,
            current_user,
            details={
                "base_count": count,
                "records_created": result.get("total_records_created", 0),
            },
        )

        return result
    except HTTPException:
        raise
    except Exception as e:
        log_action(
            "test_data_generation_failed",
            "system",
            current_user.id,
            current_user,
            details={"error": str(e)},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generando datos de prueba: {str(e)}",
        )


@router.get("/schedule", response_model=BackupScheduleOut)
def get_backup_schedule(current_user: User = Depends(require_admin)):
    """Obtiene la configuración actual de respaldos programados."""
    schedule = BackupScheduleService.get_schedule()
    log_action(
        "backup_schedule_viewed",
        "system",
        current_user.id,
        current_user,
        details=schedule,
    )
    return schedule


@router.post("/schedule", response_model=BackupScheduleOut)
def update_backup_schedule(
    request: BackupScheduleUpdate,
    current_user: User = Depends(require_admin),
):
    """Actualiza la configuración de respaldos programados."""
    try:
        schedule = BackupScheduleService.update_schedule(
            enabled=request.enabled,
            interval_minutes=request.interval_minutes,
            description=request.description,
        )
        log_action(
            "backup_schedule_updated",
            "system",
            current_user.id,
            current_user,
            details=schedule,
        )
        return schedule
    except Exception as e:
        log_action(
            "backup_schedule_update_failed",
            "system",
            current_user.id,
            current_user,
            details={"error": str(e)},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error actualizando programación de respaldos: {str(e)}",
        )
