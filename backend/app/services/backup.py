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

            # Detectar tipo de base de datos
            db_url = settings.DATABASE_URL.lower()
            is_sqlite = db_url.startswith("sqlite")

            # Nombre del archivo de respaldo
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

            if is_sqlite:
                # Para SQLite, simplemente copiar el archivo .db
                backup_name = f"hostal_backup_{timestamp}.db"
                backup_file = BACKUP_DIR / backup_name

                # Extraer la ruta del archivo SQLite de la URL
                # sqlite:///./hostal.db -> ./hostal.db
                sqlite_path = settings.DATABASE_URL.replace("sqlite:///", "")
                if not os.path.isabs(sqlite_path):
                    # Si es ruta relativa, resolverla desde el directorio backend
                    sqlite_path = Path(__file__).parent.parent.parent / sqlite_path
                else:
                    sqlite_path = Path(sqlite_path)

                if not sqlite_path.exists():
                    raise FileNotFoundError(f"Base de datos SQLite no encontrada: {sqlite_path}")

                log.info("Creating SQLite backup", source=str(sqlite_path), destination=str(backup_file))

                # Copiar el archivo SQLite
                shutil.copy2(sqlite_path, backup_file)

                # Comprimir con gzip para ahorrar espacio
                with open(backup_file, 'rb') as f_in:
                    backup_file_gz = BACKUP_DIR / f"{backup_name}.gz"
                    with gzip.open(backup_file_gz, 'wb') as f_out:
                        shutil.copyfileobj(f_in, f_out)

                # Eliminar el archivo sin comprimir
                backup_file.unlink()
                backup_file = backup_file_gz
                backup_name = f"{backup_name}.gz"

            else:
                # Para PostgreSQL, usar pg_dump
                backup_name = f"hostal_backup_{timestamp}.sql"
                backup_file = BACKUP_DIR / backup_name

                db_config = BackupService.parse_db_url(settings.DATABASE_URL)

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
                    size_bytes=file_size,
                    database_type="SQLite" if is_sqlite else "PostgreSQL")

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
            # Buscar tanto archivos PostgreSQL (.sql) como SQLite (.db.gz)
            backup_patterns = ["hostal_backup_*.sql", "hostal_backup_*.db.gz"]
            backup_files = []

            for pattern in backup_patterns:
                backup_files.extend(BACKUP_DIR.glob(pattern))

            # Ordenar por fecha de modificación (más recientes primero)
            for backup_file in sorted(backup_files, key=lambda f: f.stat().st_mtime, reverse=True):
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
                # Detectar tipo de backup
                db_type = "SQLite" if backup_file.name.endswith(".db.gz") else "PostgreSQL"
                return {
                    "id": backup_file.name,
                    "filename": backup_file.name,
                    "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "size_bytes": stat.st_size,
                    "size_mb": round(stat.st_size / (1024 * 1024), 2),
                    "type": db_type,
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

            # Detectar tipo de base de datos
            db_url = settings.DATABASE_URL.lower()
            is_sqlite = db_url.startswith("sqlite")
            is_sqlite_backup = backup_id.endswith(".db.gz")

            # Validar que el tipo de backup coincida con el tipo de BD
            if is_sqlite and not is_sqlite_backup:
                raise Exception("No se puede restaurar un backup de PostgreSQL en una base de datos SQLite")
            if not is_sqlite and is_sqlite_backup:
                raise Exception("No se puede restaurar un backup de SQLite en una base de datos PostgreSQL")

            if is_sqlite:
                # Para SQLite: descomprimir y copiar el archivo
                sqlite_path = settings.DATABASE_URL.replace("sqlite:///", "")
                if not os.path.isabs(sqlite_path):
                    # Si es ruta relativa, resolverla desde el directorio backend
                    sqlite_path = Path(__file__).parent.parent.parent / sqlite_path
                else:
                    sqlite_path = Path(sqlite_path)

                log.info("Restoring SQLite backup", source=str(backup_file), destination=str(sqlite_path))

                # Crear un backup temporal del archivo actual por seguridad
                temp_backup = None
                if sqlite_path.exists():
                    temp_backup = sqlite_path.with_suffix('.db.temp_backup')
                    shutil.copy2(sqlite_path, temp_backup)
                    log.info("Created temporary backup of current database", path=str(temp_backup))

                try:
                    # Descomprimir el backup
                    temp_restore_file = BACKUP_DIR / f"temp_restore_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
                    with gzip.open(backup_file, 'rb') as f_in:
                        with open(temp_restore_file, 'wb') as f_out:
                            shutil.copyfileobj(f_in, f_out)

                    # Reemplazar el archivo de la base de datos actual
                    if sqlite_path.exists():
                        sqlite_path.unlink()
                    shutil.move(temp_restore_file, sqlite_path)

                    # Si todo salió bien, eliminar el backup temporal
                    if temp_backup and temp_backup.exists():
                        temp_backup.unlink()

                    log.info("SQLite database restored successfully", backup_id=backup_id)

                except Exception as e:
                    # Si algo falla, restaurar el backup temporal
                    if temp_backup and temp_backup.exists():
                        if sqlite_path.exists():
                            sqlite_path.unlink()
                        shutil.move(temp_backup, sqlite_path)
                        log.warning("Restored previous database after failed restore", error=str(e))
                    raise

            else:
                # Para PostgreSQL, usar pg_restore
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

                log.info("PostgreSQL database restored successfully", backup_id=backup_id)

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

    @staticmethod
    def get_database_info(db) -> dict:
        """Obtiene información detallada sobre el contenido de la base de datos."""
        from app.models import (
            User, Guest, Room, Reservation, Device, Staff, Occupancy,
            Maintenance, NetworkActivity, NetworkDevice, Payment, ExchangeRate,
            Invoice, AuditLog, RoomRate, Media
        )

        try:
            tables_info = {
                "users": db.query(User).count(),
                "guests": db.query(Guest).count(),
                "rooms": db.query(Room).count(),
                "reservations": db.query(Reservation).count(),
                "devices": db.query(Device).count(),
                "staff": db.query(Staff).count(),
                "occupancies": db.query(Occupancy).count(),
                "maintenance": db.query(Maintenance).count(),
                "network_activities": db.query(NetworkActivity).count(),
                "network_devices": db.query(NetworkDevice).count(),
                "payments": db.query(Payment).count(),
                "exchange_rates": db.query(ExchangeRate).count(),
                "invoices": db.query(Invoice).count(),
                "audit_logs": db.query(AuditLog).count(),
                "room_rates": db.query(RoomRate).count(),
                "media": db.query(Media).count(),
            }

            total_records = sum(tables_info.values())

            return {
                "total_records": total_records,
                "tables": tables_info,
                "timestamp": datetime.now().isoformat(),
            }
        except Exception as e:
            log.error("Error getting database info", error=str(e))
            raise

    @staticmethod
    def reset_database(db, keep_admin_user_id: int) -> dict:
        """Resetea la base de datos eliminando todos los datos excepto el usuario admin actual.

        Args:
            db: Sesión de base de datos
            keep_admin_user_id: ID del usuario admin que se debe preservar

        Returns:
            dict: Resumen de la operación
        """
        from app.models import (
            User, Guest, Room, Reservation, Device, Staff, Occupancy,
            Maintenance, NetworkActivity, NetworkDevice, Payment, ExchangeRate,
            Invoice, InvoiceLine, InvoicePayment, FinancialTransaction,
            ExchangeRateSnapshot, AuditLog, RoomRate, Media
        )

        try:
            log.warning("Starting database reset", keep_admin=keep_admin_user_id)

            deleted_counts = {}

            # Orden de eliminación respetando foreign keys
            # 1. Tablas dependientes de otras
            deleted_counts["invoice_payments"] = db.query(InvoicePayment).delete()
            deleted_counts["invoice_lines"] = db.query(InvoiceLine).delete()
            deleted_counts["invoices"] = db.query(Invoice).delete()
            deleted_counts["financial_transactions"] = db.query(FinancialTransaction).delete()
            deleted_counts["exchange_rate_snapshots"] = db.query(ExchangeRateSnapshot).delete()
            deleted_counts["payments"] = db.query(Payment).delete()
            deleted_counts["occupancies"] = db.query(Occupancy).delete()
            deleted_counts["reservations"] = db.query(Reservation).delete()
            deleted_counts["devices"] = db.query(Device).delete()
            deleted_counts["network_activities"] = db.query(NetworkActivity).delete()
            deleted_counts["network_devices"] = db.query(NetworkDevice).delete()
            deleted_counts["maintenance"] = db.query(Maintenance).delete()
            deleted_counts["room_rates"] = db.query(RoomRate).delete()
            deleted_counts["media"] = db.query(Media).delete()
            deleted_counts["audit_logs"] = db.query(AuditLog).delete()

            # 2. Tablas principales
            deleted_counts["staff"] = db.query(Staff).delete()
            deleted_counts["rooms"] = db.query(Room).delete()
            deleted_counts["guests"] = db.query(Guest).delete()
            deleted_counts["exchange_rates"] = db.query(ExchangeRate).delete()

            # 3. Usuarios (excepto el admin actual)
            deleted_counts["users"] = db.query(User).filter(User.id != keep_admin_user_id).delete()

            db.commit()

            total_deleted = sum(deleted_counts.values())

            log.info("Database reset completed", total_deleted=total_deleted, preserved_admin_id=keep_admin_user_id)

            return {
                "status": "success",
                "message": "Base de datos reseteada exitosamente",
                "records_deleted": total_deleted,
                "details": deleted_counts,
                "admin_preserved": True,
                "timestamp": datetime.now().isoformat(),
            }

        except Exception as e:
            db.rollback()
            log.error("Error resetting database", error=str(e))
            raise

    @staticmethod
    def generate_test_data(db, base_count: int = 10) -> dict:
        """Genera datos de prueba en la base de datos.

        Args:
            db: Sesión de base de datos
            base_count: Número base de registros a generar

        Returns:
            dict: Resumen de los datos generados
        """
        from app.models import (
            Guest, Room, Reservation, Device, Staff, Payment,
            Maintenance, NetworkDevice, ExchangeRate, RoomRate,
            Invoice, InvoiceLine, Occupancy, NetworkActivity,
            ExchangeRateSnapshot, FinancialTransaction
        )
        from app.core.security import get_password_hash
        import random
        from datetime import datetime, timedelta
        from decimal import Decimal

        try:
            log.info("Starting test data generation", base_count=base_count)

            created_counts = {}

            # Datos de prueba
            from app.models.room import RoomType, RoomStatus
            from app.models.staff import StaffRole, StaffStatus
            from app.models.payment import PaymentMethod, PaymentStatus, Currency
            from app.models.reservation import ReservationStatus, Period
            from app.models.network_device import DeviceBrand, DeviceType, AuthType, ConnectionStatus
            from app.models.maintenance import MaintenanceType, MaintenancePriority, MaintenanceStatus
            from app.models.invoice import InvoiceStatus

            room_types = [RoomType.single, RoomType.double, RoomType.suite]
            room_statuses = [RoomStatus.available, RoomStatus.occupied, RoomStatus.cleaning, RoomStatus.maintenance]
            staff_roles = [StaffRole.recepcionista, StaffRole.mantenimiento, StaffRole.limpieza, StaffRole.gerente]
            payment_methods = [PaymentMethod.cash, PaymentMethod.card, PaymentMethod.transfer, PaymentMethod.mobile_payment, PaymentMethod.zelle]
            currencies = [Currency.USD, Currency.EUR, Currency.VES]
            reservation_statuses = [ReservationStatus.pending, ReservationStatus.active, ReservationStatus.checked_out, ReservationStatus.cancelled]
            maintenance_types = ["limpieza_profunda", "plomeria", "electricidad", "reparacion_muebles", "pintura", "aire_acondicionado", "carpinteria"]
            maintenance_priorities = ["low", "medium", "high", "urgent"]
            maintenance_statuses = ["pending", "in_progress", "completed", "cancelled"]

            # Nombres y apellidos para generar nombres realistas
            first_names = ["Carlos", "María", "José", "Ana", "Luis", "Carmen", "Pedro", "Laura", "Miguel", "Isabel",
                          "Antonio", "Rosa", "Francisco", "Elena", "Juan", "Patricia", "Ramón", "Sofía", "Ricardo", "Valentina",
                          "Fernando", "Gabriela", "Diego", "Andrea", "Alejandro", "Carolina", "Rafael", "Daniela", "Alberto", "Lucía"]
            last_names = ["García", "Rodríguez", "Martínez", "Fernández", "López", "González", "Pérez", "Sánchez", "Ramírez", "Torres",
                         "Flores", "Rivera", "Gómez", "Díaz", "Reyes", "Cruz", "Morales", "Ortiz", "Gutiérrez", "Chávez"]

            # 1. Habitaciones con más variedad
            rooms = []
            for i in range(base_count):
                room = Room(
                    number=f"{100 + i}",
                    type=random.choice(room_types),
                    price_bs=random.randint(800, 6000),
                    status=random.choice(room_statuses),
                    notes=f"Habitación de prueba #{i+1}. {random.choice(['Con balcón', 'Vista a la calle', 'Esquinera', 'Interior', 'Piso alto'])}",
                )
                db.add(room)
                rooms.append(room)
            db.flush()
            created_counts["rooms"] = len(rooms)

            # 2. Huéspedes con nombres realistas
            guests = []
            for i in range(base_count * 3):
                first_name = random.choice(first_names)
                last_name = f"{random.choice(last_names)} {random.choice(last_names)}"
                guest = Guest(
                    full_name=f"{first_name} {last_name}",
                    document_id=f"V-{10000000 + i}",
                    email=f"{first_name.lower()}.{last_name.split()[0].lower()}{i}@{'gmail.com' if i % 2 == 0 else 'hotmail.com'}",
                    phone=f"+58{random.choice(['414', '424', '412', '416'])}{random.randint(1000000, 9999999)}",
                    notes=f"País: {random.choice(['Venezuela', 'Colombia', 'España', 'Argentina', 'México', 'Chile', 'Perú'])}. Dirección: Calle {random.randint(1, 100)}, {random.choice(['Caracas', 'Maracaibo', 'Valencia', 'Maracay'])}",
                )
                db.add(guest)
                guests.append(guest)
            db.flush()
            created_counts["guests"] = len(guests)

            # 3. Personal con más variedad
            staff_members = []
            for i in range(base_count):
                first_name = random.choice(first_names)
                last_name = f"{random.choice(last_names)} {random.choice(last_names)}"
                staff = Staff(
                    full_name=f"{first_name} {last_name}",
                    document_id=f"V-{20000000 + i}",
                    role=random.choice(staff_roles),
                    phone=f"+58{random.choice(['414', '424', '412'])}{random.randint(1000000, 9999999)}",
                    email=f"staff.{first_name.lower()}{i}@hostal.com",
                    salary=random.randint(600, 2000),
                    status=random.choice([StaffStatus.active, StaffStatus.inactive]) if i % 10 != 0 else StaffStatus.active,
                    hire_date=datetime.now().date() - timedelta(days=random.randint(30, 1000)),
                )
                db.add(staff)
                staff_members.append(staff)
            db.flush()
            created_counts["staff"] = len(staff_members)

            # 4. Reservas con más variedad temporal
            reservations = []
            for i in range(min(base_count * 2, len(rooms) * 3, len(guests))):
                start_date = datetime.now().date() + timedelta(days=random.randint(-90, 60))
                periods = random.randint(1, 21)
                period_type = random.choice([Period.day, Period.week, Period.month])

                if period_type == Period.day:
                    end_date = start_date + timedelta(days=periods)
                elif period_type == Period.week:
                    end_date = start_date + timedelta(weeks=periods)
                else:
                    end_date = start_date + timedelta(days=periods * 30)

                reservation = Reservation(
                    guest_id=guests[random.randint(0, len(guests) - 1)].id,
                    room_id=rooms[random.randint(0, len(rooms) - 1)].id,
                    start_date=start_date,
                    end_date=end_date,
                    period=period_type,
                    periods_count=periods,
                    price_bs=random.randint(500, 5000),
                    status=random.choice(reservation_statuses),
                    notes=f"Reserva de prueba #{i+1}" if i % 3 == 0 else None,
                )
                db.add(reservation)
                reservations.append(reservation)
            db.flush()
            created_counts["reservations"] = len(reservations)

            # 5. Pagos con más variedad
            payments = []
            for i in range(len(reservations)):
                currency = random.choice(currencies)
                amount = random.randint(10, 500) if currency == Currency.USD else (random.randint(10, 300) if currency == Currency.EUR else random.randint(300, 20000))

                payment = Payment(
                    guest_id=reservations[i].guest_id,
                    amount=amount,
                    currency=currency,
                    method=random.choice(payment_methods),
                    status=random.choice([PaymentStatus.completed, PaymentStatus.pending]) if i % 10 != 0 else PaymentStatus.completed,
                    payment_date=datetime.now() - timedelta(days=random.randint(0, 60)),
                    reference_number=f"REF-{random.randint(100000, 999999)}" if i % 2 == 0 else None,
                    notes=f"Pago de prueba #{i+1}" if i % 5 == 0 else None,
                )
                db.add(payment)
                payments.append(payment)
            db.flush()
            created_counts["payments"] = len(payments)

            # 6. Facturas con líneas de factura (modelo venezolano)
            invoices = []
            invoice_lines_total = 0
            for i in range(min(base_count * 2, len(guests))):
                invoice_date = datetime.now().date() - timedelta(days=random.randint(0, 90))
                guest = guests[random.randint(0, len(guests) - 1)]

                # Calcular valores
                subtotal_amount = float(random.randint(500, 5000))
                tax_percentage = 16.0
                tax_amount = subtotal_amount * (tax_percentage / 100.0)
                total_amount = subtotal_amount + tax_amount

                invoice = Invoice(
                    guest_id=guest.id,
                    client_name=guest.full_name,
                    client_rif=f"J-{random.randint(300000000, 399999999)}" if i % 3 == 0 else None,
                    client_email=guest.email,
                    client_phone=guest.phone,
                    control_number=f"HC-{i+1:08d}",  # Número de control SENIAT
                    invoice_number=i + 1,  # Número secuencial (int)
                    invoice_series="A",
                    invoice_date=invoice_date,
                    status=random.choice([InvoiceStatus.issued, InvoiceStatus.paid, InvoiceStatus.draft]) if i % 15 != 0 else InvoiceStatus.paid,
                    currency="VES" if i % 3 != 0 else "USD",
                    exchange_rate=1.0 if i % 3 != 0 else random.uniform(30.0, 45.0),
                    subtotal=subtotal_amount,
                    taxable_amount=subtotal_amount,
                    tax_percentage=tax_percentage,
                    tax_amount=tax_amount,
                    total=total_amount,
                    notes=f"Factura de prueba #{i+1}" if i % 4 == 0 else None,
                )
                db.add(invoice)
                db.flush()

                # Agregar líneas de factura
                num_lines = random.randint(1, 5)
                line_subtotal = 0.0
                for j in range(num_lines):
                    unit_price = float(random.randint(50, 1000))
                    quantity = float(random.randint(1, 10))
                    line_total = unit_price * quantity
                    line_tax = line_total * 0.16

                    invoice_line = InvoiceLine(
                        invoice_id=invoice.id,
                        description=random.choice([
                            "Hospedaje - Habitación estándar",
                            "Hospedaje - Suite",
                            "Servicio de limpieza",
                            "Lavandería",
                            "Desayuno",
                            "Servicio a la habitación",
                            "Internet Premium",
                            "Traslado al aeropuerto"
                        ]),
                        quantity=quantity,
                        unit_price=unit_price,
                        line_total=line_total,
                        is_taxable=True,
                        tax_percentage=16.0,
                        tax_amount=line_tax,
                        line_order=j + 1,
                    )
                    db.add(invoice_line)
                    line_subtotal += line_total
                    invoice_lines_total += 1

                # Actualizar totales de la factura con los valores reales
                invoice.subtotal = line_subtotal
                invoice.taxable_amount = line_subtotal
                invoice.tax_amount = line_subtotal * 0.16
                invoice.total = line_subtotal + invoice.tax_amount

                invoices.append(invoice)
            db.flush()
            created_counts["invoices"] = len(invoices)
            created_counts["invoice_lines"] = invoice_lines_total

            # 7. Dispositivos de red
            network_devices = []
            for i in range(max(1, base_count // 3)):
                device = NetworkDevice(
                    name=f"{random.choice(['Router', 'Switch', 'Access Point'])}-{i+1}",
                    brand=random.choice(["mikrotik", "ubiquiti", "tp_link", "cisco"]),
                    device_type=random.choice(["router", "switch", "access_point"]),
                    ip_address=f"192.168.{random.randint(1, 10)}.{random.randint(1, 254)}",
                    port=random.choice([8728, 80, 443, 22]),
                    username="admin",
                    auth_type=random.choice(["username_password", "ssh_key"]),
                    connection_status=random.choice(["connected", "disconnected", "error"]) if i % 10 != 0 else "connected",
                )
                db.add(device)
                network_devices.append(device)
            db.flush()
            created_counts["network_devices"] = len(network_devices)

            # 8. Dispositivos de huéspedes
            devices = []
            for i in range(min(base_count * 4, len(guests) * 2)):
                device = Device(
                    guest_id=guests[random.randint(0, len(guests) - 1)].id,
                    mac=f"{random.randint(0, 255):02x}:{random.randint(0, 255):02x}:{random.randint(0, 255):02x}:{random.randint(0, 255):02x}:{random.randint(0, 255):02x}:{random.randint(0, 255):02x}",
                    name=random.choice(["iPhone", "Samsung Galaxy", "MacBook", "HP Laptop", "iPad", "Android Tablet", "Dell Laptop"]) + f" #{i+1}",
                    suspended=random.random() < 0.1,  # 10% suspendidos
                )
                db.add(device)
                devices.append(device)
            db.flush()
            created_counts["devices"] = len(devices)

            # 9. Actividades de red
            from app.models.network_activity import ActivityType
            network_activities = []
            for i in range(min(base_count * 5, len(devices) * 3)):
                device = devices[random.randint(0, len(devices) - 1)]
                bytes_down = random.randint(100 * 1024 * 1024, 50000 * 1024 * 1024)  # 100MB a 50GB en bytes
                bytes_up = random.randint(10 * 1024 * 1024, 5000 * 1024 * 1024)  # 10MB a 5GB en bytes
                activity = NetworkActivity(
                    device_id=device.id,
                    guest_id=device.guest_id,
                    activity_type=random.choice([ActivityType.connected, ActivityType.disconnected, ActivityType.blocked, ActivityType.unblocked]),
                    bytes_downloaded=bytes_down,
                    bytes_uploaded=bytes_up,
                    session_duration_seconds=random.randint(300, 86400),  # 5 minutos a 24 horas
                    timestamp=datetime.now() - timedelta(hours=random.randint(0, 720)),  # últimos 30 días
                    ip_address=f"192.168.{random.randint(1, 10)}.{random.randint(10, 254)}",
                )
                db.add(activity)
                network_activities.append(activity)
            db.flush()
            created_counts["network_activities"] = len(network_activities)

            # 10. Órdenes de mantenimiento
            maintenances = []
            for i in range(base_count):
                reported_date = datetime.now() - timedelta(days=random.randint(0, 60))
                maint = Maintenance(
                    room_id=rooms[random.randint(0, len(rooms) - 1)].id,
                    type=random.choice(maintenance_types),
                    title=f"{random.choice(['Reparación', 'Revisión', 'Instalación', 'Mantenimiento'])} - {random.choice(['urgente', 'programado', 'preventivo'])}",
                    description=f"Mantenimiento de prueba #{i+1}. {random.choice(['Requiere atención inmediata', 'Programado para este mes', 'Revisión de rutina', 'Reporte de huésped'])}",
                    priority=random.choice(maintenance_priorities),
                    status=random.choice(maintenance_statuses),
                    reported_at=reported_date,
                    completed_at=reported_date + timedelta(days=random.randint(1, 14)) if random.random() > 0.5 else None,
                    assigned_to=staff_members[random.randint(0, len(staff_members) - 1)].id if staff_members and random.random() > 0.3 else None,
                )
                db.add(maint)
                maintenances.append(maint)
            db.flush()
            created_counts["maintenances"] = len(maintenances)

            # 11. Ocupancias
            occupancies = []
            for i in range(min(base_count, len(reservations))):
                if reservations[i].status == ReservationStatus.active:
                    occupancy = Occupancy(
                        reservation_id=reservations[i].id,
                        room_id=reservations[i].room_id,
                        guest_id=reservations[i].guest_id,
                        check_in=reservations[i].start_date,
                        check_out=reservations[i].end_date if random.random() > 0.7 else None,
                    )
                    db.add(occupancy)
                    occupancies.append(occupancy)
            db.flush()
            created_counts["occupancies"] = len(occupancies)

            # 12. Tasas de cambio con histórico
            exchange_rates = []
            for i in range(random.randint(5, 15)):
                rate = ExchangeRate(
                    from_currency="USD",
                    to_currency="VES",
                    rate=random.uniform(30.0, 45.0),
                    source=random.choice(["manual", "bcv", "dolar_today"]),
                    is_manual=random.choice([0, 1]),
                    date=datetime.now() - timedelta(days=i * 7),
                )
                db.add(rate)
                exchange_rates.append(rate)
            db.flush()
            created_counts["exchange_rates"] = len(exchange_rates)

            # 13. Snapshots de tasas de cambio
            exchange_rate_snapshots = []
            for i in range(random.randint(3, 10)):
                # Generar tasas realistas
                ves_to_usd_rate = random.uniform(0.020, 0.030)  # 1 VES = ~0.025 USD
                ves_to_eur_rate = random.uniform(0.018, 0.027)  # 1 VES = ~0.022 EUR
                usd_to_eur_rate = random.uniform(0.85, 0.95)    # 1 USD = ~0.90 EUR

                snapshot = ExchangeRateSnapshot(
                    ves_to_usd=ves_to_usd_rate,
                    ves_to_eur=ves_to_eur_rate,
                    usd_to_eur=usd_to_eur_rate,
                    source=random.choice(["dolarapi", "bcv", "manual", "exchangerate-api"]),
                    is_manual=random.choice([0, 1]),
                    snapshot_date=datetime.now() - timedelta(days=i * 7),  # Un snapshot por semana
                )
                db.add(snapshot)
                exchange_rate_snapshots.append(snapshot)
            db.flush()
            created_counts["exchange_rate_snapshots"] = len(exchange_rate_snapshots)

            # 14. Tarifas de habitación
            room_rates = []
            for room in rooms:
                # Generar múltiples tarifas por periodo
                for period in [Period.day, Period.week, Period.month]:
                    rate = RoomRate(
                        room_id=room.id,
                        period=period,
                        price_bs=random.randint(1000, 8000) if period == Period.day else (
                            random.randint(6000, 50000) if period == Period.week else random.randint(20000, 150000)
                        ),
                    )
                    db.add(rate)
                    room_rates.append(rate)
            db.flush()
            created_counts["room_rates"] = len(room_rates)

            db.commit()

            total_created = sum(created_counts.values())

            log.info("Test data generation completed", total_created=total_created)

            return {
                "status": "success",
                "message": f"Datos de prueba generados exitosamente: {total_created} registros",
                "total_records_created": total_created,
                "details": created_counts,
                "timestamp": datetime.now().isoformat(),
            }

        except Exception as e:
            db.rollback()
            log.error("Error generating test data", error=str(e))
            raise
