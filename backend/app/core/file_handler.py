# app/core/file_handler.py
"""Utilidades seguras para manejo de archivos."""
import hashlib
import imghdr
import mimetypes
import os
import re
import uuid
from pathlib import Path
from typing import BinaryIO

from fastapi import HTTPException, UploadFile
from PIL import Image

# Configuración
# Usar ruta absoluta basada en la ubicación del proyecto
UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB para imágenes
MAX_DOCUMENT_SIZE = 10 * 1024 * 1024  # 10 MB para documentos

# Compresión de imágenes
MAX_IMAGE_DIMENSION = 2048  # px
IMAGE_QUALITY = 85

# Tipos MIME permitidos (whitelist estricto)
ALLOWED_MIMES = {
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "image/gif": [".gif"],
    "image/webp": [".webp"],
    "application/pdf": [".pdf"],
}

# Extensiones permitidas
ALLOWED_EXTENSIONS = {ext for exts in ALLOWED_MIMES.values() for ext in exts}


class SecureFileHandler:
    """Manejador seguro de archivos con validaciones exhaustivas."""

    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """Sanitiza nombre de archivo eliminando caracteres peligrosos."""
        # Eliminar path separators y caracteres especiales
        filename = os.path.basename(filename)
        filename = re.sub(r'[^\w\s\-.]', '', filename)
        filename = re.sub(r'\.\.+', '.', filename)  # Prevenir ..
        filename = filename[:255]  # Limit length

        if not filename or filename.startswith('.'):
            raise HTTPException(
                status_code=400,
                detail="Invalid filename"
            )

        return filename

    @staticmethod
    def get_file_extension(filename: str) -> str:
        """Obtiene extensión del archivo de forma segura."""
        ext = Path(filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"File extension {ext} not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        return ext

    @staticmethod
    def validate_mime_type(content_type: str, extension: str) -> None:
        """Valida que el MIME type coincida con la extensión."""
        if content_type not in ALLOWED_MIMES:
            raise HTTPException(
                status_code=400,
                detail=f"MIME type {content_type} not allowed"
            )

        allowed_exts = ALLOWED_MIMES[content_type]
        if extension not in allowed_exts:
            raise HTTPException(
                status_code=400,
                detail=f"Extension {extension} doesn't match MIME type {content_type}"
            )

    @staticmethod
    def verify_image_content(file_path: Path) -> bool:
        """Verifica que el archivo sea realmente una imagen válida."""
        try:
            # Usar imghdr para detectar tipo real
            actual_type = imghdr.what(file_path)
            if actual_type not in ['jpeg', 'png', 'gif', 'webp']:
                return False

            # Intentar abrir con PIL para validar integridad
            with Image.open(file_path) as img:
                img.verify()

            return True
        except Exception:
            return False

    @staticmethod
    def verify_pdf_content(file_path: Path) -> bool:
        """Verifica que el archivo sea realmente un PDF válido."""
        try:
            with open(file_path, 'rb') as f:
                # PDF debe empezar con %PDF-
                header = f.read(5)
                return header == b'%PDF-'
        except Exception:
            return False

    @staticmethod
    def compress_image(file_path: Path) -> None:
        """Comprime y redimensiona imagen si es necesario."""
        try:
            with Image.open(file_path) as img:
                # Convertir RGBA a RGB si es necesario
                if img.mode in ('RGBA', 'LA', 'P'):
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    if img.mode == 'P':
                        img = img.convert('RGBA')
                    background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                    img = background

                # Redimensionar si es muy grande
                if img.width > MAX_IMAGE_DIMENSION or img.height > MAX_IMAGE_DIMENSION:
                    img.thumbnail((MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION), Image.Resampling.LANCZOS)

                # Guardar comprimido
                img.save(file_path, optimize=True, quality=IMAGE_QUALITY)
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Error processing image: {str(e)}"
            )

    @staticmethod
    def calculate_file_hash(file_path: Path) -> str:
        """Calcula hash SHA256 del archivo."""
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()

    @staticmethod
    async def save_upload_file_secure(
        upload_file: UploadFile,
        category: str = "other",
        max_size: int | None = None
    ) -> dict:
        """
        Guarda archivo de forma segura con todas las validaciones.

        Returns:
            dict con información del archivo guardado
        """
        # 1. Sanitizar filename
        safe_filename = SecureFileHandler.sanitize_filename(upload_file.filename)
        extension = SecureFileHandler.get_file_extension(safe_filename)

        # 2. Validar MIME type
        SecureFileHandler.validate_mime_type(upload_file.content_type, extension)

        # 3. Determinar tamaño máximo
        is_image = upload_file.content_type.startswith("image")
        max_allowed_size = max_size or (MAX_IMAGE_SIZE if is_image else MAX_DOCUMENT_SIZE)

        # 4. Generar nombre único
        unique_filename = f"{uuid.uuid4()}{extension}"
        file_path = UPLOAD_DIR / unique_filename

        # 5. Guardar archivo en streaming (seguro para archivos grandes)
        file_size = 0
        with open(file_path, "wb") as f:
            while chunk := await upload_file.read(8192):  # 8KB chunks
                file_size += len(chunk)
                if file_size > max_allowed_size:
                    # Limpiar archivo parcial
                    f.close()
                    os.remove(file_path)
                    raise HTTPException(
                        status_code=400,
                        detail=f"File too large. Max size: {max_allowed_size / 1024 / 1024:.1f} MB"
                    )
                f.write(chunk)

        # 6. Validar contenido real del archivo
        if is_image:
            if not SecureFileHandler.verify_image_content(file_path):
                os.remove(file_path)
                raise HTTPException(
                    status_code=400,
                    detail="File is not a valid image"
                )
            # Comprimir imagen
            SecureFileHandler.compress_image(file_path)
            # Recalcular tamaño después de compresión
            file_size = os.path.getsize(file_path)
        elif upload_file.content_type == "application/pdf":
            if not SecureFileHandler.verify_pdf_content(file_path):
                os.remove(file_path)
                raise HTTPException(
                    status_code=400,
                    detail="File is not a valid PDF"
                )

        # 7. Calcular hash del archivo
        file_hash = SecureFileHandler.calculate_file_hash(file_path)

        return {
            "original_filename": safe_filename,
            "stored_filename": unique_filename,
            "file_path": str(file_path),
            "file_size": file_size,
            "mime_type": upload_file.content_type,
            "file_hash": file_hash,
            "is_image": is_image,
        }

    @staticmethod
    def delete_file_secure(file_path: str) -> bool:
        """Elimina archivo de forma segura."""
        try:
            path = Path(file_path)

            # Verificar que el archivo está en el directorio de uploads
            if not path.resolve().is_relative_to(UPLOAD_DIR.resolve()):
                raise HTTPException(
                    status_code=400,
                    detail="Invalid file path"
                )

            if path.exists():
                path.unlink()
                return True
            return False
        except Exception as e:
            print(f"Error deleting file: {e}")
            return False
