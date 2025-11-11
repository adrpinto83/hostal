# app/models/media.py
"""
Modelo para gestión de archivos multimedia.
Soporta fotos de habitaciones, documentos de huéspedes, etc.
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import relationship

from ..core.db import Base


class MediaType(str, Enum):
    """Tipos de archivos multimedia."""
    image = "image"  # Imagen (JPG, PNG, etc.)
    document = "document"  # Documento (PDF, DOCX, etc.)
    video = "video"  # Video (MP4, etc.)
    other = "other"  # Otro tipo


class MediaCategory(str, Enum):
    """Categorías de archivos."""
    room_photo = "room_photo"  # Foto de habitación
    guest_id = "guest_id"  # Documento de identidad del huésped
    guest_photo = "guest_photo"  # Foto del huésped
    payment_proof = "payment_proof"  # Comprobante de pago
    maintenance_photo = "maintenance_photo"  # Foto de mantenimiento
    other = "other"  # Otro


class Media(Base):
    """Archivos multimedia del sistema."""
    __tablename__ = "media"

    id = Column(Integer, primary_key=True, index=True)

    # Información del archivo
    filename = Column(String(255), nullable=False)  # Nombre original
    stored_filename = Column(String(255), nullable=False, unique=True)  # Nombre en storage
    file_path = Column(String(500), nullable=False)  # Path completo o URL
    file_size = Column(Integer, nullable=False)  # Tamaño en bytes
    mime_type = Column(String(100), nullable=False)  # image/jpeg, application/pdf, etc.
    file_hash = Column(String(64), nullable=True, index=True)  # SHA256 hash para detección de duplicados

    # Clasificación
    media_type = Column(
        SAEnum(MediaType, name="media_type", create_constraint=True),
        nullable=False,
        index=True
    )
    category = Column(
        SAEnum(MediaCategory, name="media_category", create_constraint=True),
        nullable=False,
        index=True
    )

    # Relaciones opcionales (puede estar asociado a múltiples entidades)
    guest_id = Column(Integer, ForeignKey("guests.id", ondelete="CASCADE"), nullable=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=True, index=True)
    maintenance_id = Column(Integer, ForeignKey("maintenances.id", ondelete="CASCADE"), nullable=True, index=True)
    payment_id = Column(Integer, ForeignKey("payments.id", ondelete="CASCADE"), nullable=True, index=True)

    # Metadatos
    title = Column(String(200), nullable=True)  # Título descriptivo
    description = Column(Text, nullable=True)  # Descripción
    alt_text = Column(String(200), nullable=True)  # Texto alternativo para imágenes

    # Auditoría
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    uploaded_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)

    # Relaciones
    guest = relationship("Guest")
    room = relationship("Room")
    maintenance = relationship("Maintenance")
    payment = relationship("Payment")
    uploader = relationship("User", foreign_keys=[uploaded_by])

    @property
    def file_size_mb(self) -> float:
        """Retorna el tamaño del archivo en MB."""
        return self.file_size / (1024 * 1024)

    @property
    def is_image(self) -> bool:
        """Verifica si es una imagen."""
        return self.media_type == MediaType.image

    @property
    def is_document(self) -> bool:
        """Verifica si es un documento."""
        return self.media_type == MediaType.document

    @property
    def url(self) -> str:
        """Retorna la URL pública del archivo."""
        from ..core.config import settings

        # Si está en cloud storage, file_path ya es la URL
        if self.file_path.startswith("http"):
            return self.file_path

        # Si es local, construir URL absoluta
        return f"{settings.API_URL}/media/{self.stored_filename}"
