# app/routers/media.py
"""Endpoints para carga y gestión de archivos multimedia."""
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..core.security import get_current_user, require_roles
from ..models.media import Media, MediaCategory, MediaType
from ..models.user import User

router = APIRouter(prefix="/media", tags=["Media"])

# Configuración de almacenamiento
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Límites y tipos permitidos
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
ALLOWED_DOCUMENT_TYPES = {"application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
ALLOWED_TYPES = ALLOWED_IMAGE_TYPES | ALLOWED_DOCUMENT_TYPES


def validate_file(file: UploadFile):
    """Valida tipo y tamaño de archivo."""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type {file.content_type} not allowed. Allowed: JPG, PNG, GIF, WEBP, PDF, DOCX",
        )

    # Nota: file.size no está disponible directamente, validar al leer
    return True


@router.post(
    "/upload",
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Subir archivo (imagen o documento)",
)
async def upload_file(
    file: UploadFile = File(...),
    category: str = "other",
    guest_id: int | None = None,
    room_id: int | None = None,
    title: str | None = None,
    description: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Sube un archivo al servidor.

    - **file**: Archivo a subir (max 10MB)
    - **category**: room_photo, guest_id, guest_photo, payment_proof, etc.
    - **guest_id**: ID del huésped (opcional)
    - **room_id**: ID de la habitación (opcional)
    - **title**: Título descriptivo
    - **description**: Descripción
    """
    validate_file(file)

    # Generar nombre único
    file_ext = Path(file.filename).suffix
    stored_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = UPLOAD_DIR / stored_filename

    # Leer y guardar archivo
    content = await file.read()

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Max size: {MAX_FILE_SIZE / 1024 / 1024} MB")

    with open(file_path, "wb") as f:
        f.write(content)

    # Determinar tipo
    media_type = MediaType.image if file.content_type.startswith("image") else MediaType.document

    # Crear registro en BD
    media = Media(
        filename=file.filename,
        stored_filename=stored_filename,
        file_path=str(file_path),
        file_size=len(content),
        mime_type=file.content_type,
        media_type=media_type,
        category=MediaCategory(category),
        guest_id=guest_id,
        room_id=room_id,
        title=title,
        description=description,
        uploaded_by=current_user.id,
    )

    db.add(media)
    db.commit()
    db.refresh(media)

    return {
        "id": media.id,
        "filename": media.filename,
        "url": media.url,
        "type": media.media_type.value,
        "size_mb": media.file_size_mb,
    }


@router.get(
    "/",
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Listar archivos",
)
def list_media(
    guest_id: int | None = None,
    room_id: int | None = None,
    category: str | None = None,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """Lista archivos multimedia con filtros opcionales."""
    query = db.query(Media).order_by(Media.uploaded_at.desc())

    if guest_id:
        query = query.filter(Media.guest_id == guest_id)
    if room_id:
        query = query.filter(Media.room_id == room_id)
    if category:
        query = query.filter(Media.category == category)

    media_list = query.limit(limit).all()

    return [
        {
            "id": m.id,
            "filename": m.filename,
            "url": m.url,
            "type": m.media_type.value,
            "category": m.category.value,
            "size_mb": m.file_size_mb,
            "uploaded_at": m.uploaded_at.isoformat(),
        }
        for m in media_list
    ]


@router.delete(
    "/{media_id}",
    dependencies=[Depends(require_roles("admin"))],
    summary="Eliminar archivo",
)
def delete_media(media_id: int, db: Session = Depends(get_db)):
    """Elimina un archivo del sistema."""
    media = db.get(Media, media_id)
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    # Eliminar archivo físico
    try:
        if os.path.exists(media.file_path):
            os.remove(media.file_path)
    except Exception as e:
        print(f"Error deleting file: {e}")

    # Eliminar registro
    db.delete(media)
    db.commit()

    return {"message": "Media deleted successfully"}
