# app/models/audit_log.py
"""
Modelo de registro de auditoría para consultas desde la base de datos.
Permite al admin ver toda la traza de acciones por usuario.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship, Mapped, mapped_column
from typing import Optional

from ..core.db import Base


class AuditLog(Base):
    """Registro de auditoría de acciones del sistema"""
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, index=True, default=datetime.utcnow)

    # Usuario que realizó la acción
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    user_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    user_role: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Acción y recurso
    action: Mapped[str] = mapped_column(String(100), index=True)  # create, update, delete, login, approve, etc.
    resource_type: Mapped[str] = mapped_column(String(100), index=True)  # user, guest, room, reservation, etc.
    resource_id: Mapped[Optional[int]] = mapped_column(nullable=True, index=True)

    # Detalles
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON string
    success: Mapped[bool] = mapped_column(Boolean, default=True, index=True)

    # IP del cliente (si disponible)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)

    # Índices para búsquedas comunes
    __table_args__ = (
        # Índice compuesto para consultas por usuario y fecha
        # Ya existe en el archivo de índices automático de SQLAlchemy
    )

    def __repr__(self):
        return f"<AuditLog {self.id}: {self.action} {self.resource_type}/{self.resource_id} by {self.user_email} at {self.timestamp}>"
