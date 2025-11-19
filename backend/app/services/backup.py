# app/services/backup.py
"""Servicio para manejar respaldos y restauración del sistema."""
import os
import subprocess
import gzip
import shutil
from datetime import datetime
from pathlib import Path
from typing import Optional
import structlog
from app.core.config import settings

log = structlog.get_logger()

# Directorio para almacenar backups
BACKUP_DIR = Path(__file__).parent.parent.parent / "backups"
try:
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
except PermissionError:
    # Si no se puede crear en el directorio del app, usar /tmp
    BACKUP_DIR = Path("/tmp/hostal_backups")
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)


class BackupService:
    """Servicio para crear y restaurar respaldos de la base de datos."""

    @staticmethod
    def parse_db_url(db_url: str) -> dict:
        """Parsea la URL de conexión PostgreSQL."""
        # Ejemplo: postgresql://user:password@localhost:5432/dbname
        # También maneja: postgresql+psycopg://user:password@localhost:5432/dbname
        try:
            if "://" not in db_url:
                raise ValueError("URL de base de datos inválida")

            # Remover el prefijo y drivers específicos
            db_url = db_url.replace("postgresql+psycopg://", "")
            db_url = db_url.replace("postgresql://", "")
            db_url = db_url.replace("postgres://", "")

            # Parsear credenciales
            if "@" in db_url:
                creds, host_db = db_url.split("@", 1)
                user, password = creds.split(":", 1) if ":" in creds else (creds, "")
            else:
                host_db = db_url
                user = "postgres"
                password = ""

            # Parsear host, puerto y base de datos
            if "/" in host_db:
                host_port, dbname = host_db.split("/", 1)
            else:
                host_port = host_db
                dbname = "hostal"

            if ":" in host_port:
                host, port = host_port.split(":", 1)
                port = int(port)
            else:
                host = host_port
                port = 5432

            return {
                "user": user,
                "password": password,
                "host": host,
                "port": port,
                "dbname": dbname,
            }
        except Exception as e:
            log.error("Error parsing database URL", error=str(e))
            raise

    @staticmethod
    def create_backup(description: Optional[str] = None) -> dict:
        """Crea un respaldo de la base de datos.

        Returns:
            dict: Información del respaldo creado
        """
        try:
            log.info("Starting database backup")

            # Parsear URL de base de datos
            db_config = BackupService.parse_db_url(settings.DATABASE_URL)

            # Nombre del archivo de respaldo
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_name = f"hostal_backup_{timestamp}.sql"
            backup_file = BACKUP_DIR / backup_name

            # Comando para hacer dump de PostgreSQL
            env = os.environ.copy()
            if db_config["password"]:
                env["PGPASSWORD"] = db_config["password"]

            cmd = [
                "pg_dump",
                "-h",
                db_config["host"],
                "-p",
                str(db_config["port"]),
                "-U",
                db_config["user"],
                "-F",
                "c",  # Formato custom (compresión)
                "-f",
                str(backup_file),
                db_config["dbname"],
            ]

            # Ejecutar pg_dump
            result = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=600)

            if result.returncode != 0:
                error_msg = result.stderr or "Unknown error"
                log.error("Backup failed", error=error_msg)
                if backup_file.exists():
                    backup_file.unlink()
                raise Exception(f"pg_dump falló: {error_msg}")

            # Obtener información del archivo
            file_size = backup_file.stat().st_size
            created_at = datetime.now().isoformat()

            log.info("Backup created successfully",
                    backup_name=backup_name,
                    size_bytes=file_size)

            return {
                "id": backup_name,
                "filename": backup_name,
                "created_at": created_at,
                "size_bytes": file_size,
                "size_mb": round(file_size / (1024 * 1024), 2),
                "description": description or f"Backup automático {timestamp}",
                "status": "completed",
            }

        except Exception as e:
            log.error("Error creating backup", error=str(e))
            raise

    @staticmethod
    def list_backups() -> list[dict]:
        """Lista todos los respaldos disponibles."""
        try:
            backups = []
            for backup_file in sorted(BACKUP_DIR.glob("hostal_backup_*.sql"), reverse=True):
                stat = backup_file.stat()
                backups.append({
                    "id": backup_file.name,
                    "filename": backup_file.name,
                    "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "size_bytes": stat.st_size,
                    "size_mb": round(stat.st_size / (1024 * 1024), 2),
                })
            return backups
        except Exception as e:
            log.error("Error listing backups", error=str(e))
            raise

    @staticmethod
    def get_backup(backup_id: str) -> Optional[dict]:
        """Obtiene información de un respaldo específico."""
        try:
            backup_file = BACKUP_DIR / backup_id
            if backup_file.exists() and backup_file.name.startswith("hostal_backup_"):
                stat = backup_file.stat()
                return {
                    "id": backup_file.name,
                    "filename": backup_file.name,
                    "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "size_bytes": stat.st_size,
                    "size_mb": round(stat.st_size / (1024 * 1024), 2),
                }
            return None
        except Exception as e:
            log.error("Error getting backup info", backup_id=backup_id, error=str(e))
            return None

    @staticmethod
    def restore_backup(backup_id: str) -> dict:
        """Restaura una base de datos desde un respaldo.

        WARNING: Esta operación ELIMINARÁ los datos actuales y los reemplazará
        con los del respaldo.

        Returns:
            dict: Resultado de la restauración
        """
        try:
            backup_file = BACKUP_DIR / backup_id
            if not backup_file.exists() or not backup_file.name.startswith("hostal_backup_"):
                raise FileNotFoundError(f"Respaldo no encontrado: {backup_id}")

            log.warning("Starting database restore", backup_id=backup_id)

            # Parsear URL de base de datos
            db_config = BackupService.parse_db_url(settings.DATABASE_URL)

            # Comando para restaurar PostgreSQL
            env = os.environ.copy()
            if db_config["password"]:
                env["PGPASSWORD"] = db_config["password"]

            cmd = [
                "pg_restore",
                "-h",
                db_config["host"],
                "-p",
                str(db_config["port"]),
                "-U",
                db_config["user"],
                "-d",
                db_config["dbname"],
                "--clean",  # Elimina objetos existentes
                "--if-exists",  # No falla si los objetos no existen
                str(backup_file),
            ]

            # Ejecutar pg_restore
            result = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=600)

            if result.returncode != 0:
                error_msg = result.stderr or "Unknown error"
                log.error("Restore failed", error=error_msg, backup_id=backup_id)
                raise Exception(f"pg_restore falló: {error_msg}")

            log.info("Database restored successfully", backup_id=backup_id)

            return {
                "status": "success",
                "message": f"Base de datos restaurada desde {backup_id}",
                "backup_id": backup_id,
                "restored_at": datetime.now().isoformat(),
            }

        except Exception as e:
            log.error("Error restoring backup", backup_id=backup_id, error=str(e))
            raise

    @staticmethod
    def delete_backup(backup_id: str) -> dict:
        """Elimina un respaldo."""
        try:
            backup_file = BACKUP_DIR / backup_id
            if not backup_file.exists() or not backup_file.name.startswith("hostal_backup_"):
                raise FileNotFoundError(f"Respaldo no encontrado: {backup_id}")

            backup_file.unlink()
            log.info("Backup deleted", backup_id=backup_id)

            return {
                "status": "success",
                "message": f"Respaldo {backup_id} eliminado",
                "backup_id": backup_id,
            }

        except Exception as e:
            log.error("Error deleting backup", backup_id=backup_id, error=str(e))
            raise

    @staticmethod
    def download_backup(backup_id: str) -> Optional[Path]:
        """Obtiene la ruta del respaldo para descargarlo."""
        try:
            backup_file = BACKUP_DIR / backup_id
            if backup_file.exists() and backup_file.name.startswith("hostal_backup_"):
                return backup_file
            return None
        except Exception as e:
            log.error("Error accessing backup file", backup_id=backup_id, error=str(e))
            return None
