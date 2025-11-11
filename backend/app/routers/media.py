# app/routers/media.py
"""Endpoints para carga y gestión de archivos multimedia - VERSIÓN SEGURA."""
import structlog
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..core.file_handler import SecureFileHandler
from ..core.security import get_current_user, require_roles
from ..models.media import Media, MediaCategory, MediaType
from ..models.user import User

router = APIRouter(prefix="/media", tags=["Media"])
log = structlog.get_logger()


@router.post(
    "/upload",
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Subir archivo (imagen o documento) - SEGURO",
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
    Sube un archivo al servidor con validaciones de seguridad exhaustivas.

    **Seguridad implementada:**
    - Validación de MIME type vs extensión
    - Verificación de contenido real (no solo headers)
    - Protección contra path traversal
    - Sanitización de nombres de archivo
    - Lectura en streaming (previene DoS)
    - Compresión automática de imágenes
    - Hash SHA256 para detección de duplicados

    **Parámetros:**
    - **file**: Archivo a subir (max 10MB documentos, 5MB imágenes)
    - **category**: room_photo, guest_photo, guest_id, payment_proof, other
    - **guest_id**: ID del huésped (opcional)
    - **room_id**: ID de la habitación (opcional)
    - **title**: Título descriptivo
    - **description**: Descripción adicional
    """
    log.info(
        "upload_file_attempt",
        filename=file.filename,
        content_type=file.content_type,
        category=category,
        user_id=current_user.id,
    )

    try:
        # Validar categoría
        try:
            category_enum = MediaCategory(category)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid category. Allowed: {[c.value for c in MediaCategory]}"
            )

        # Verificar duplicados por hash (opcional pero recomendado)
        # Se podría implementar aquí un chequeo de file_hash existente

        # Guardar archivo de forma segura
        file_info = await SecureFileHandler.save_upload_file_secure(
            upload_file=file,
            category=category
        )

        # Determinar tipo de media
        media_type = MediaType.image if file_info["is_image"] else MediaType.document

        # Crear registro en BD
        media = Media(
            filename=file_info["original_filename"],
            stored_filename=file_info["stored_filename"],
            file_path=file_info["file_path"],
            file_size=file_info["file_size"],
            mime_type=file_info["mime_type"],
            file_hash=file_info.get("file_hash"),
            media_type=media_type,
            category=category_enum,
            guest_id=guest_id,
            room_id=room_id,
            title=title,
            description=description,
            uploaded_by=current_user.id,
        )

        db.add(media)
        db.commit()
        db.refresh(media)

        log.info(
            "upload_file_success",
            media_id=media.id,
            filename=media.filename,
            size_mb=media.file_size_mb,
            user_id=current_user.id,
        )

        return {
            "id": media.id,
            "filename": media.filename,
            "url": media.url,
            "type": media.media_type.value,
            "size_mb": media.file_size_mb,
            "hash": media.file_hash,
        }

    except HTTPException:
        raise
    except Exception as e:
        log.error("upload_file_error", error=str(e), user_id=current_user.id)
        raise HTTPException(
            status_code=500,
            detail=f"Error uploading file: {str(e)}"
        )


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
    summary="Eliminar archivo - SEGURO",
)
def delete_media(
    media_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Elimina un archivo del sistema de forma segura."""
    media = db.get(Media, media_id)
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    log.info(
        "delete_media_attempt",
        media_id=media_id,
        filename=media.filename,
        user_id=current_user.id,
    )

    # Eliminar archivo físico de forma segura
    file_deleted = SecureFileHandler.delete_file_secure(media.file_path)

    if not file_deleted:
        log.warning(
            "file_not_found_on_disk",
            media_id=media_id,
            file_path=media.file_path,
        )

    # Eliminar registro de BD
    db.delete(media)
    db.commit()

    log.info("delete_media_success", media_id=media_id, user_id=current_user.id)

    return {
        "message": "Media deleted successfully",
        "file_deleted": file_deleted,
    }


@router.get(
    "/stats",
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Estadísticas de archivos",
)
def get_media_stats(db: Session = Depends(get_db)):
    """Obtiene estadísticas de uso de almacenamiento."""
    total_files = db.query(func.count(Media.id)).scalar()
    total_size = db.query(func.sum(Media.file_size)).scalar() or 0

    by_type = db.query(
        Media.media_type,
        func.count(Media.id).label('count'),
        func.sum(Media.file_size).label('total_size')
    ).group_by(Media.media_type).all()

    by_category = db.query(
        Media.category,
        func.count(Media.id).label('count')
    ).group_by(Media.category).all()

    return {
        "total_files": total_files,
        "total_size_mb": round(total_size / (1024 * 1024), 2),
        "by_type": [
            {
                "type": t.value,
                "count": count,
                "size_mb": round((total_size or 0) / (1024 * 1024), 2)
            }
            for t, count, total_size in by_type
        ],
        "by_category": [
            {"category": c.value, "count": count}
            for c, count in by_category
        ],
    }
