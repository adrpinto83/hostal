#!/bin/bash

# Script para crear datos de prueba completos en el sistema

echo "🧪 Creando datos de prueba para el sistema..."
echo ""

cd backend
source venv/bin/activate

# Cargar variables definidas en backend/.env para respetar la configuración activa
if [ -f ".env" ]; then
  set -a
  source .env
  set +a
fi

# Alinear DATABASE_URL con el backend: construirlo desde POSTGRES_* o usar SQLite como último recurso
if [ -z "${DATABASE_URL:-}" ]; then
  if [ -n "${POSTGRES_USER:-}" ] || [ -n "${POSTGRES_PASSWORD:-}" ] || [ -n "${POSTGRES_DB:-}" ] || [ -n "${POSTGRES_HOST:-}" ] || [ -n "${POSTGRES_PORT:-}" ]; then
    DB_USER="${POSTGRES_USER:-hostal}"
    DB_PASS="${POSTGRES_PASSWORD:-hostal_pass}"
    DB_NAME="${POSTGRES_DB:-hostal_db}"
    DB_HOST="${POSTGRES_HOST:-127.0.0.1}"
    DB_PORT="${POSTGRES_PORT:-5432}"
    export DATABASE_URL="postgresql+psycopg://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
    echo "ℹ️  DATABASE_URL construido desde variables POSTGRES_*: $DATABASE_URL"
  else
    export DATABASE_URL="sqlite:///hostal.db"
    echo "ℹ️  DATABASE_URL no definido; usando SQLite local (backend/hostal.db) para semillas."
  fi
fi

if [[ "$DATABASE_URL" == sqlite* ]]; then
  SQLITE_PATH="${DATABASE_URL#sqlite:///}"
  SQLITE_PATH="${SQLITE_PATH%%\?*}"
  if [[ "$DATABASE_URL" == sqlite:////* ]]; then
    SQLITE_PATH="/${SQLITE_PATH#\/}"
  fi
  if [[ -n "$SQLITE_PATH" && "$SQLITE_PATH" != ":memory:" ]]; then
    if [ -f "$SQLITE_PATH" ]; then
      echo "🧹  Eliminando base SQLite previa ($SQLITE_PATH)..."
      rm -f "$SQLITE_PATH"
    fi
  fi

  echo "🗄️  Inicializando esquema SQLite..."
  python <<'PY'
from app.core.db import Base, engine
import app.models  # noqa: F401 - Register all models

Base.metadata.create_all(bind=engine)
PY
  echo "✓ Esquema SQLite sincronizado"
else
  echo "🗄️  Verificando migraciones..."
  alembic upgrade head >/dev/null
  echo "✓ Esquema actualizado"
fi

python << 'EOF'
import json
from datetime import date, datetime, timedelta

from app.core.db import SessionLocal
from app.core.security import get_password_hash
from app.models.audit_log import AuditLog
from app.models.device import Device
from app.models.exchange_rate import ExchangeRate
from app.models.guest import Guest
from app.models.maintenance import Maintenance, MaintenancePriority, MaintenanceStatus, MaintenanceType
from app.models.media import Media, MediaCategory, MediaType
from app.models.network_activity import ActivityType, NetworkActivity
from app.models.occupancy import Occupancy
from app.models.payment import Currency, Payment, PaymentMethod, PaymentStatus
from app.models.reservation import Period, Reservation, ReservationStatus
from app.models.room import Room, RoomStatus, RoomType
from app.models.room_rate import RoomRate
from app.models.staff import Staff, StaffRole, StaffStatus
from app.models.user import User

db = SessionLocal()

try:
    print("Creando habitaciones de prueba...")
    rooms_data = [
        {"number": "101", "type": RoomType.single, "status": RoomStatus.available, "notes": "Habitación con vista al jardín"},
        {"number": "102", "type": RoomType.double, "status": RoomStatus.available, "notes": "Habitación estándar"},
        {"number": "103", "type": RoomType.suite, "status": RoomStatus.available, "notes": "Habitación con balcón"},
        {"number": "201", "type": RoomType.single, "status": RoomStatus.cleaning, "notes": "Habitación segundo piso"},
        {"number": "202", "type": RoomType.double, "status": RoomStatus.maintenance, "notes": "Aire acondicionado en reparación"},
    ]
    rooms = {}
    for room_data in rooms_data:
        existing = db.query(Room).filter(Room.number == room_data["number"]).first()
        if not existing:
            room = Room(**room_data)
            db.add(room)
            db.flush()
            print(f"  ✓ Habitación {room.number} creada")
        else:
            room = existing
            print(f"  - Habitación {room.number} ya existe")
        rooms[room.number] = room
    db.commit()

    print("\nCreando tarifas de habitación de prueba...")
    for room_number, room_obj in rooms.items():
        rates_data = [
            {"period": Period.day, "price_bs": 25.00 if room_obj.type == RoomType.single else (35.00 if room_obj.type == RoomType.double else 50.00)},
            {"period": Period.week, "price_bs": 150.00 if room_obj.type == RoomType.single else (210.00 if room_obj.type == RoomType.double else 300.00)},
            {"period": Period.month, "price_bs": 500.00 if room_obj.type == RoomType.single else (700.00 if room_obj.type == RoomType.double else 1000.00)},
        ]
        for rate_data in rates_data:
            existing_rate = db.query(RoomRate).filter_by(room_id=room_obj.id, period=rate_data["period"]).first()
            if not existing_rate:
                new_rate = RoomRate(room_id=room_obj.id, **rate_data)
                db.add(new_rate)
                print(f"  ✓ Tarifa de {rate_data['period'].value} para habitación {room_number} creada")
    db.commit()

    print("\nCreando huéspedes de prueba...")
    guests_data = [
        {"full_name": "Juan Carlos Pérez", "document_id": "V-12345678", "phone": "+58 412 1234567", "email": "juan.perez@example.com", "notes": "Cliente frecuente"},
        {"full_name": "María González", "document_id": "V-23456789", "phone": "+58 414 2345678", "email": "maria.gonzalez@example.com"},
        {"full_name": "Pedro Ramírez", "document_id": "V-34567890", "phone": "+58 424 3456789", "email": "pedro.ramirez@example.com"},
    ]
    guests = {}
    for guest_data in guests_data:
        existing = db.query(Guest).filter(Guest.document_id == guest_data["document_id"]).first()
        if not existing:
            guest = Guest(**guest_data)
            db.add(guest)
            print(f"  ✓ Huésped {guest.full_name} creado")
        else:
            guest = existing
            print(f"  - Huésped {guest.full_name} ya existe")
        guests[guest.document_id] = guest
    db.commit()

    print("\nCreando personal de prueba...")
    staff_data = [
        {"full_name": "Ana Martínez", "document_id": "V-45678901", "phone": "+58 412 4567890", "email": "ana.martinez@hostal.com", "role": StaffRole.recepcionista, "status": StaffStatus.active, "hire_date": date(2024, 1, 15), "salary": 350.00},
        {"full_name": "Carlos López", "document_id": "V-56789012", "phone": "+58 414 5678901", "email": "carlos.lopez@hostal.com", "role": StaffRole.mantenimiento, "status": StaffStatus.active, "hire_date": date(2024, 2, 1), "salary": 400.00},
        {"full_name": "Luisa Fernández", "document_id": "V-67890123", "phone": "+58 424 6789012", "email": "luisa.fernandez@hostal.com", "role": StaffRole.limpieza, "status": StaffStatus.active, "hire_date": date(2024, 1, 20), "salary": 300.00},
    ]
    staff_members = {}
    for member_data in staff_data:
        existing = db.query(Staff).filter(Staff.document_id == member_data["document_id"]).first()
        if not existing:
            staff = Staff(**member_data)
            db.add(staff)
            print(f"  ✓ Personal {staff.full_name} creado")
        else:
            staff = existing
            print(f"  - Personal {staff.full_name} ya existe")
        staff_members[staff.role] = staff
    db.commit()

    print("\nCreando usuarios del sistema...")
    users_data = [
        {"email": "admin@hostal.com", "full_name": "Administrador Principal", "role": "admin"},
        {"email": "recepcion@hostal.com", "full_name": "Recepción Turno A", "role": "recepcionista"},
        {"email": "gerente@hostal.com", "full_name": "Gerente General", "role": "gerente"},
    ]
    users = {}
    default_password = get_password_hash("admin123")
    for user_data in users_data:
        existing = db.query(User).filter(User.email == user_data["email"]).first()
        if not existing:
            user = User(
                email=user_data["email"],
                full_name=user_data["full_name"],
                role=user_data["role"],
                approved=True,
                hashed_password=default_password,
            )
            db.add(user)
            db.flush()
            print(f"  ✓ Usuario {user.email} ({user.role}) creado")
        else:
            user = existing
            print(f"  - Usuario {user.email} ya existe")
        users[user.email] = user
    db.commit()

    print("\nCreando reservas de prueba...")
    today = date.today()
    reservations_data = [
        {
            "key": "suite_weekend",
            "guest_doc": "V-12345678",
            "room_number": "103",
            "start_date": today + timedelta(days=2),
            "end_date": today + timedelta(days=5),
            "period": Period.day,
            "periods_count": 3,
            "price_bs": 450.0,
            "status": ReservationStatus.active,
            "notes": "Reserva confirmada desde la web",
        },
        {
            "key": "double_pending",
            "guest_doc": "V-23456789",
            "room_number": "102",
            "start_date": today + timedelta(days=7),
            "end_date": today + timedelta(days=14),
            "period": Period.week,
            "periods_count": 1,
            "price_bs": 210.0,
            "status": ReservationStatus.pending,
            "notes": "Pendiente por pago de anticipo",
        },
        {
            "key": "single_cancelled",
            "guest_doc": "V-34567890",
            "room_number": "101",
            "start_date": today - timedelta(days=10),
            "end_date": today - timedelta(days=7),
            "period": Period.day,
            "periods_count": 3,
            "price_bs": 75.0,
            "status": ReservationStatus.cancelled,
            "notes": "Cancelada por el huésped",
        },
    ]
    reservations = {}
    for res_data in reservations_data:
        guest = guests[res_data["guest_doc"]]
        room = rooms[res_data["room_number"]]
        payload = {
            "guest_id": guest.id,
            "room_id": room.id,
            "start_date": res_data["start_date"],
            "end_date": res_data["end_date"],
            "period": res_data["period"],
            "periods_count": res_data["periods_count"],
            "price_bs": res_data["price_bs"],
            "status": res_data["status"],
            "notes": res_data["notes"],
        }
        existing = (
            db.query(Reservation)
            .filter(
                Reservation.room_id == room.id,
                Reservation.guest_id == guest.id,
                Reservation.start_date == payload["start_date"],
            )
            .first()
        )
        if not existing:
            reservation = Reservation(**payload)
            db.add(reservation)
            db.flush()
            print(f"  ✓ Reserva {res_data['key']} creada para {guest.full_name}")
        else:
            reservation = existing
            print(f"  - Reserva {res_data['key']} ya existe")
        reservations[res_data["key"]] = reservation
    db.commit()

    print("\nCreando ocupaciones de prueba...")
    occupancy_records = {}
    occupancies_data = [
        {
            "key": "occ_room_101",
            "room_id": rooms["101"].id,
            "guest_id": guests["V-12345678"].id,
            "check_in": datetime.utcnow() - timedelta(days=2),
            "check_out": None,
            "amount_paid_usd": 150.00,
            "payment_method": "Tarjeta de Crédito",
            "reservation_key": "suite_weekend",
        },
        {
            "key": "occ_room_102",
            "room_id": rooms["102"].id,
            "guest_id": guests["V-23456789"].id,
            "check_in": datetime.utcnow() - timedelta(days=5),
            "check_out": datetime.utcnow() - timedelta(days=1),
            "amount_paid_usd": 200.00,
            "payment_method": "Efectivo",
            "reservation_key": "double_pending",
        },
    ]
    for occ_data in occupancies_data:
        reservation_id = None
        if occ_data.get("reservation_key"):
            reservation = reservations.get(occ_data["reservation_key"])
            if reservation:
                reservation_id = reservation.id

        existing = (
            db.query(Occupancy)
            .filter(
                Occupancy.room_id == occ_data["room_id"],
                Occupancy.guest_id == occ_data["guest_id"],
                Occupancy.check_in == occ_data["check_in"],
            )
            .first()
        )
        if not existing:
            payload = {k: v for k, v in occ_data.items() if k not in {"key", "reservation_key"}}
            payload["reservation_id"] = reservation_id
            occupancy = Occupancy(**payload)
            db.add(occupancy)
            room = db.get(Room, occ_data["room_id"])
            if room and not occ_data["check_out"]:
                room.status = RoomStatus.occupied
            print(f"  ✓ Ocupación creada para habitación {room.number}")
        else:
            occupancy = existing
            print(f"  - Ocupación para habitación {existing.room_id} ya existe")
        if occ_data.get("key"):
            occupancy_records[occ_data["key"]] = occupancy
    db.commit()

    print("\nCreando tareas de mantenimiento de prueba...")
    maintenance_staff = staff_members.get(StaffRole.mantenimiento)
    maintenances_data = [
        {
            "room_id": rooms["202"].id,
            "type": MaintenanceType.aire_acondicionado,
            "priority": MaintenancePriority.high,
            "title": "Reparar aire acondicionado",
            "description": "El A/C no enfría, hace ruido.",
            "status": MaintenanceStatus.pending,
            "assigned_to": maintenance_staff.id if maintenance_staff else None,
        },
        {
            "room_id": rooms["201"].id,
            "type": MaintenanceType.limpieza_profunda,
            "priority": MaintenancePriority.low,
            "title": "Limpieza profunda de alfombra",
            "description": "Mancha de café en la alfombra.",
            "status": MaintenanceStatus.completed,
            "completed_at": datetime.utcnow(),
        },
    ]
    for maint_data in maintenances_data:
        existing = db.query(Maintenance).filter_by(room_id=maint_data["room_id"], title=maint_data["title"]).first()
        if not existing:
            maintenance = Maintenance(**maint_data)
            db.add(maintenance)
            print(f"  ✓ Tarea de mantenimiento '{maint_data['title']}' creada")
        else:
            print(f"  - Tarea '{maint_data['title']}' ya existe")
    db.commit()

    print("\nCreando dispositivos de red de prueba...")
    devices_data = [
        {
            "guest_doc": "V-12345678",
            "mac": "AA:BB:CC:DD:EE:01",
            "name": "iPhone 14 Pro",
            "vendor": "Apple",
            "last_ip": "192.168.1.45",
            "first_seen": datetime.utcnow() - timedelta(days=30),
            "last_seen": datetime.utcnow() - timedelta(minutes=5),
            "downloaded": 15 * 1024 * 1024 * 1024,
            "uploaded": 2 * 1024 * 1024 * 1024,
        },
        {
            "guest_doc": "V-23456789",
            "mac": "AA:BB:CC:DD:EE:02",
            "name": "Laptop Dell XPS",
            "vendor": "Dell",
            "last_ip": "192.168.1.52",
            "first_seen": datetime.utcnow() - timedelta(days=12),
            "last_seen": datetime.utcnow() - timedelta(minutes=30),
            "downloaded": 8 * 1024 * 1024 * 1024,
            "uploaded": 1 * 1024 * 1024 * 1024,
        },
        {
            "guest_doc": "V-34567890",
            "mac": "AA:BB:CC:DD:EE:03",
            "name": "Tablet Samsung",
            "vendor": "Samsung",
            "last_ip": "192.168.1.60",
            "first_seen": datetime.utcnow() - timedelta(days=5),
            "last_seen": datetime.utcnow() - timedelta(minutes=1),
            "downloaded": 3 * 1024 * 1024 * 1024,
            "uploaded": 0.5 * 1024 * 1024 * 1024,
            "suspended": True,
            "suspension_reason": "Consumo sospechoso",
        },
    ]
    device_map = {}
    for device_data in devices_data:
        guest = guests[device_data["guest_doc"]]
        existing = db.query(Device).filter(Device.mac == device_data["mac"].upper()).first()
        payload = {
            "guest_id": guest.id,
            "mac": device_data["mac"].upper(),
            "name": device_data["name"],
            "vendor": device_data["vendor"],
            "allowed": device_data.get("allowed", True),
            "suspended": device_data.get("suspended", False),
            "suspension_reason": device_data.get("suspension_reason"),
            "daily_quota_mb": device_data.get("daily_quota_mb"),
            "monthly_quota_mb": device_data.get("monthly_quota_mb"),
            "first_seen": device_data.get("first_seen"),
            "last_seen": device_data.get("last_seen"),
            "last_ip": device_data.get("last_ip"),
            "total_bytes_downloaded": int(device_data.get("downloaded", 0)),
            "total_bytes_uploaded": int(device_data.get("uploaded", 0)),
        }
        if not existing:
            device = Device(**payload)
            db.add(device)
            db.flush()
            print(f"  ✓ Dispositivo {device.mac} registrado")
        else:
            device = existing
            for field, value in payload.items():
                setattr(device, field, value)
            print(f"  - Dispositivo {device.mac} actualizado")
        device_map[device.mac] = device
    db.commit()

    print("\nRegistrando actividad de red de ejemplo...")
    network_logs = [
        {
            "mac": "AA:BB:CC:DD:EE:01",
            "activity_type": ActivityType.connected,
            "timestamp": datetime.utcnow() - timedelta(hours=2),
            "ip_address": "192.168.1.45",
            "downloaded": 500 * 1024 * 1024,
            "uploaded": 80 * 1024 * 1024,
            "notes": "Conexión estable desde habitación 101",
        },
        {
            "mac": "AA:BB:CC:DD:EE:03",
            "activity_type": ActivityType.blocked,
            "timestamp": datetime.utcnow() - timedelta(hours=1),
            "ip_address": "192.168.1.60",
            "downloaded": 200 * 1024 * 1024,
            "uploaded": 20 * 1024 * 1024,
            "initiated_by_system": False,
            "notes": "Bloqueado por exceder cuota diaria",
        },
    ]
    for entry in network_logs:
        device = device_map.get(entry["mac"].upper())
        if not device:
            continue
        exists = (
            db.query(NetworkActivity)
            .filter(
                NetworkActivity.device_id == device.id,
                NetworkActivity.activity_type == entry["activity_type"],
                NetworkActivity.timestamp == entry["timestamp"],
            )
            .first()
        )
        if not exists:
            log = NetworkActivity(
                device_id=device.id,
                guest_id=device.guest_id,
                activity_type=entry["activity_type"],
                timestamp=entry["timestamp"],
                ip_address=entry.get("ip_address"),
                bytes_downloaded=entry.get("downloaded"),
                bytes_uploaded=entry.get("uploaded"),
                initiated_by_system=entry.get("initiated_by_system", True),
                notes=entry.get("notes"),
            )
            db.add(log)
            print(f"  ✓ Actividad {entry['activity_type'].value} registrada para {device.mac}")
    db.commit()

    print("\nRegistrando pagos multimoneda de prueba...")
    payments_data = [
        {
            "reference": "PAY-1001",
            "guest_doc": "V-12345678",
            "reservation_key": "suite_weekend",
            "occupancy_key": "occ_room_101",
            "amount": 240.0,
            "currency": Currency.USD,
            "amount_usd": 240.0,
            "amount_eur": 222.0,
            "amount_ves": 9600.0,
            "method": PaymentMethod.card,
            "status": PaymentStatus.completed,
            "notes": "Pago con tarjeta MasterCard",
            "payment_date": datetime.utcnow() - timedelta(days=1),
            "created_by_email": "admin@hostal.com",
        },
        {
            "reference": "PAY-1002",
            "guest_doc": "V-23456789",
            "reservation_key": "double_pending",
            "amount": 150.0,
            "currency": Currency.VES,
            "amount_usd": 3.5,
            "amount_eur": 3.2,
            "amount_ves": 150.0,
            "method": PaymentMethod.transfer,
            "status": PaymentStatus.pending,
            "notes": "Transferencia bancaria pendiente de confirmación",
            "payment_date": datetime.utcnow() - timedelta(hours=3),
            "created_by_email": "recepcion@hostal.com",
        },
        {
            "reference": "PAY-1003",
            "guest_doc": "V-34567890",
            "amount": 80.0,
            "currency": Currency.EUR,
            "amount_usd": 86.0,
            "amount_ves": 3440.0,
            "method": PaymentMethod.zelle,
            "status": PaymentStatus.completed,
            "notes": "Pago Zelle para upgrade de habitación",
            "payment_date": datetime.utcnow() - timedelta(days=3),
            "created_by_email": "gerente@hostal.com",
        },
    ]
    for payment_data in payments_data:
        existing = db.query(Payment).filter(Payment.reference_number == payment_data["reference"]).first()
        guest = guests[payment_data["guest_doc"]]
        reservation_id = reservations.get(payment_data.get("reservation_key")).id if payment_data.get("reservation_key") and reservations.get(payment_data["reservation_key"]) else None
        occupancy_id = occupancy_records.get(payment_data.get("occupancy_key")).id if payment_data.get("occupancy_key") and occupancy_records.get(payment_data["occupancy_key"]) else None
        creator = users.get(payment_data["created_by_email"])
        payload = {
            "guest_id": guest.id,
            "reservation_id": reservation_id,
            "occupancy_id": occupancy_id,
            "amount": payment_data["amount"],
            "currency": payment_data["currency"],
            "amount_eur": payment_data.get("amount_eur"),
            "amount_usd": payment_data.get("amount_usd"),
            "amount_ves": payment_data.get("amount_ves"),
            "exchange_rate_eur": payment_data.get("exchange_rate_eur"),
            "exchange_rate_usd": payment_data.get("exchange_rate_usd"),
            "exchange_rate_ves": payment_data.get("exchange_rate_ves"),
            "method": payment_data["method"],
            "status": payment_data["status"],
            "reference_number": payment_data["reference"],
            "notes": payment_data.get("notes"),
            "payment_date": payment_data.get("payment_date", datetime.utcnow()),
            "created_by": creator.id if creator else None,
        }
        if not existing:
            payment = Payment(**payload)
            db.add(payment)
            print(f"  ✓ Pago {payment.reference_number} registrado")
        else:
            for field, value in payload.items():
                setattr(existing, field, value)
            print(f"  - Pago {payment_data['reference']} actualizado")
    db.commit()

    print("\nAñadiendo archivos multimedia de ejemplo...")
    payment_pay1001 = db.query(Payment).filter(Payment.reference_number == "PAY-1001").first()
    media_entries = [
        {
            "stored_filename": "guest-juan-avatar.jpg",
            "filename": "juan-avatar.jpg",
            "file_path": "https://picsum.photos/seed/juan/300/300",
            "file_size": 120000,
            "mime_type": "image/jpeg",
            "media_type": MediaType.image,
            "category": MediaCategory.guest_photo,
            "guest_id": guests["V-12345678"].id,
            "title": "Foto de perfil de Juan",
            "is_primary": True,
        },
        {
            "stored_filename": "room-103.jpg",
            "filename": "room-103.jpg",
            "file_path": "https://picsum.photos/seed/room103/640/480",
            "file_size": 420000,
            "mime_type": "image/jpeg",
            "media_type": MediaType.image,
            "category": MediaCategory.room_photo,
            "room_id": rooms["103"].id,
            "title": "Suite con balcón",
            "description": "Vista nocturna de la suite",
            "is_primary": True,
        },
        {
            "stored_filename": "payment-1001.pdf",
            "filename": "comprobante-1001.pdf",
            "file_path": "https://example.com/payment-1001.pdf",
            "file_size": 98000,
            "mime_type": "application/pdf",
            "media_type": MediaType.document,
            "category": MediaCategory.payment_proof,
            "payment_id": payment_pay1001.id if payment_pay1001 else None,
            "title": "Comprobante pago PAY-1001",
        },
    ]
    for media_data in media_entries:
        if media_data.get("payment_id") is None and media_data["category"] == MediaCategory.payment_proof:
            continue
        existing = db.query(Media).filter(Media.stored_filename == media_data["stored_filename"]).first()
        payload = {
            **media_data,
            "uploaded_by": users.get("admin@hostal.com").id if users.get("admin@hostal.com") else None,
        }
        if not existing:
            media = Media(**payload)
            db.add(media)
            print(f"  ✓ Archivo {media.stored_filename} creado")
        else:
            for field, value in payload.items():
                setattr(existing, field, value)
            print(f"  - Archivo {media_data['stored_filename']} actualizado")
    db.commit()

    print("\nActualizando tasas de cambio...")
    rates_data = [
        {"from_currency": "USD", "to_currency": "VES", "rate": 40.5},
        {"from_currency": "EUR", "to_currency": "USD", "rate": 1.08},
        {"from_currency": "USD", "to_currency": "EUR", "rate": 0.93},
    ]
    for rate_data in rates_data:
        existing = (
            db.query(ExchangeRate)
            .filter(
                ExchangeRate.from_currency == rate_data["from_currency"],
                ExchangeRate.to_currency == rate_data["to_currency"],
            )
            .order_by(ExchangeRate.date.desc())
            .first()
        )
        if not existing:
            rate = ExchangeRate(
                from_currency=rate_data["from_currency"],
                to_currency=rate_data["to_currency"],
                rate=rate_data["rate"],
                source="seed_script",
                is_manual=1,
            )
            db.add(rate)
            print(f"  ✓ Tasa {rate_data['from_currency']}->{rate_data['to_currency']} registrada")
        else:
            existing.rate = rate_data["rate"]
            existing.source = "seed_script_update"
            print(f"  - Tasa {rate_data['from_currency']}->{rate_data['to_currency']} actualizada")
    db.commit()

    print("\nGenerando registros de auditoría de ejemplo...")
    audit_entries = [
        {
            "action": "login",
            "resource_type": "user",
            "resource_id": users["admin@hostal.com"].id,
            "description": "Ingreso exitoso al panel",
            "user_email": "admin@hostal.com",
            "user_role": "admin",
            "details": {"ip": "127.0.0.1"},
        },
        {
            "action": "create",
            "resource_type": "reservation",
            "resource_id": reservations["suite_weekend"].id,
            "description": "Reserva creada manualmente",
            "user_email": "recepcion@hostal.com",
            "user_role": "recepcionista",
            "details": {"room": "103", "guest": "Juan Carlos Pérez"},
        },
        {
            "action": "update",
            "resource_type": "maintenance",
            "resource_id": db.query(Maintenance).first().id if db.query(Maintenance).first() else None,
            "description": "Actualización de estatus de mantenimiento",
            "user_email": "gerente@hostal.com",
            "user_role": "gerente",
            "details": {"status": "completed"},
        },
    ]
    for entry in audit_entries:
        if entry["resource_id"] is None:
            continue
        existing = (
            db.query(AuditLog)
            .filter(
                AuditLog.action == entry["action"],
                AuditLog.resource_type == entry["resource_type"],
                AuditLog.resource_id == entry["resource_id"],
                AuditLog.user_email == entry["user_email"],
            )
            .first()
        )
        payload = {
            "user_id": users[entry["user_email"]].id if users.get(entry["user_email"]) else None,
            "user_email": entry["user_email"],
            "user_role": entry["user_role"],
            "action": entry["action"],
            "resource_type": entry["resource_type"],
            "resource_id": entry["resource_id"],
            "description": entry["description"],
            "details": json.dumps(entry.get("details", {})),
            "success": True,
            "ip_address": entry.get("ip_address", "127.0.0.1"),
        }
        if not existing:
            log = AuditLog(**payload)
            db.add(log)
            print(f"  ✓ Auditoría '{entry['action']}' registrada")
        else:
            for field, value in payload.items():
                setattr(existing, field, value)
            print(f"  - Auditoría para {entry['resource_type']} ya existe")
    db.commit()

    print("\n✅ Datos de prueba creados exitosamente!")
    print("\n📊 Resumen:")
    print(f"  • {db.query(Room).count()} habitaciones")
    print(f"  • {db.query(RoomRate).count()} tarifas de habitación")
    print(f"  • {db.query(Guest).count()} huéspedes")
    print(f"  • {db.query(Staff).count()} empleados")
    print(f"  • {db.query(User).count()} usuarios")
    print(f"  • {db.query(Reservation).count()} reservas")
    print(f"  • {db.query(Occupancy).count()} registros de ocupación")
    print(f"  • {db.query(Maintenance).count()} tareas de mantenimiento")
    print(f"  • {db.query(Device).count()} dispositivos de red")
    print(f"  • {db.query(NetworkActivity).count()} eventos de red")
    print(f"  • {db.query(Payment).count()} pagos")
    print(f"  • {db.query(Media).count()} archivos multimedia")
    print(f"  • {db.query(ExchangeRate).count()} tasas de cambio")
    print(f"  • {db.query(AuditLog).count()} eventos de auditoría")
    print("\n💡 Ahora puedes ver estos datos en el frontend")

finally:
    db.close()
EOF

cd ..
