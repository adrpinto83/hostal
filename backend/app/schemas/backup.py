# app/schemas/backup.py
"""Esquemas para operaciones de respaldo y restauración."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class BackupCreate(BaseModel):
    """Solicitud para crear un respaldo."""
    description: Optional[str] = Field(
        None,
        description="Descripción opcional del respaldo"
    )


class BackupOut(BaseModel):
    """Información de un respaldo."""
    id: str = Field(..., description="ID único del respaldo")
    filename: str = Field(..., description="Nombre del archivo de respaldo")
    created_at: str = Field(..., description="Fecha y hora de creación")
    size_bytes: int = Field(..., description="Tamaño del archivo en bytes")
    size_mb: float = Field(..., description="Tamaño del archivo en MB")
    description: Optional[str] = Field(None, description="Descripción del respaldo")

    class Config:
        from_attributes = True


class BackupListOut(BaseModel):
    """Lista de respaldos disponibles."""
    backups: list[BackupOut] = Field(..., description="Lista de respaldos")
    total: int = Field(..., description="Total de respaldos disponibles")


class RestoreRequest(BaseModel):
    """Solicitud para restaurar una base de datos."""
    backup_id: str = Field(..., description="ID del respaldo a restaurar")
    confirm: bool = Field(
        ...,
        description="Confirmación explícita (debe ser True para proceder)"
    )


class RestoreResponse(BaseModel):
    """Respuesta de operación de restauración."""
    status: str = Field(..., description="Estado de la operación")
    message: str = Field(..., description="Mensaje descriptivo")
    backup_id: str = Field(..., description="ID del respaldo restaurado")
    restored_at: str = Field(..., description="Fecha y hora de restauración")


class DeleteBackupRequest(BaseModel):
    """Solicitud para eliminar un respaldo."""
    backup_id: str = Field(..., description="ID del respaldo a eliminar")


class SystemHealthOut(BaseModel):
    """Estado de salud del sistema."""
    database: str = Field(..., description="Estado de la base de datos")
    backups_available: int = Field(..., description="Número de respaldos disponibles")
    latest_backup: Optional[str] = Field(None, description="Fecha del respaldo más reciente")
    total_backup_size_mb: float = Field(..., description="Tamaño total de respaldos en MB")
    timestamp: str = Field(..., description="Timestamp de la verificación")


class BackupScheduleOut(BaseModel):
    """Configuración de respaldos programados."""
    enabled: bool = Field(..., description="Si el respaldo recurrente está activo")
    interval_minutes: int = Field(..., description="Intervalo en minutos entre respaldos")
    next_run: Optional[str] = Field(None, description="Próxima ejecución programada")
    last_run: Optional[str] = Field(None, description="Última ejecución completada")
    description: Optional[str] = Field(None, description="Descripción utilizada en los respaldos programados")


class BackupScheduleUpdate(BaseModel):
    """Solicitud para actualizar la programación de respaldos."""
    enabled: bool = Field(..., description="Activar o desactivar la programación")
    interval_minutes: int = Field(..., ge=15, le=10080, description="Intervalo en minutos (entre 15 y 10080)")
    description: Optional[str] = Field(None, description="Descripción opcional para los respaldos programados")
