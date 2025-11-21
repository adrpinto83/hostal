# app/schemas/audit.py
"""Schemas para auditoría y logs del sistema"""
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class AuditLogOut(BaseModel):
    """Schema para retornar logs de auditoría"""
    id: int
    timestamp: datetime
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    user_role: Optional[str] = None
    action: str
    resource_type: str
    resource_id: Optional[int] = None
    description: Optional[str] = None
    details: Optional[str] = None
    success: bool
    ip_address: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AuditLogFilter(BaseModel):
    """Schema para filtros de búsqueda de logs"""
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    action: Optional[str] = None
    resource_type: Optional[str] = None
    resource_id: Optional[int] = None
    success: Optional[bool] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    limit: int = 100  # Máximo 100 resultados por defecto
    offset: int = 0


class AuditSummary(BaseModel):
    """Resumen de actividad por usuario"""
    user_id: int
    user_email: str
    user_role: str
    total_actions: int
    last_action: datetime
    failed_actions: int
    successful_actions: int
