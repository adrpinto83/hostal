#!/usr/bin/env python3
"""
Script para generar datos de prueba en la base de datos.
Ejecutar desde el directorio backend: python seed_data.py
"""

from datetime import datetime, timedelta
import random
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.db import SessionLocal, engine, Base
from app.models.user import User
from app.models.guest import Guest
from app.models.room import Room, RoomType, RoomStatus
from app.models.room_rate import RoomRate
from app.models.reservation import Reservation, ReservationStatus, Period
from app.models.payment import Payment, Currency, PaymentStatus
from app.models.device import Device
from app.models.occupancy import Occupancy
from app.core.security import hash_password

# Nombres de prueba
FIRST_NAMES = ["Juan", "María", "Carlos", "Ana", "Pedro", "Elena", "Luis", "Rosa", "Miguel", "Sofia"]
LAST_NAMES = ["García", "Rodríguez", "Martínez", "Pérez", "López", "González", "Sánchez", "Fernández", "Díaz", "Moreno"]
PHONE_NUMBERS = ["+584121234567", "+584161234567", "+584141234567", "+584151234567", "+584261234567"]
EMAILS = ["user@example.com", "guest@example.com", "admin@example.com", "test@example.com", "hostal@example.com"]
DEVICE_NAMES = ["iPhone de Juan", "Samsung Galaxy", "iPad", "Laptop HP", "Macbook Pro"]

def create_users(db: Session):
    """Crear usuarios de prueba"""
    print("📝 Creando usuarios...")

    users = [
        User(
            email="admin@hostal.com",
            hashed_password=hash_password("admin123"),
            full_name="Administrador",
            role="admin",
            approved=True
        ),
        User(
            email="recepcionista@hostal.com",
            hashed_password=hash_password("recep123"),
            full_name="Recepcionista",
            role="recepcionista",
            approved=True
        ),
    ]

    for user in users:
        existing = db.query(User).filter(User.email == user.email).first()
        if not existing:
            db.add(user)

    db.commit()
    print("✅ Usuarios creados")
    return users

def create_guests(db: Session):
    """Crear huéspedes de prueba"""
    print("📝 Creando huéspedes...")

    guests = []
    for i in range(10):
        first_name = random.choice(FIRST_NAMES)
        last_name = random.choice(LAST_NAMES)
        guest = Guest(
            full_name=f"{first_name} {last_name}",
            document_id=f"V-{random.randint(10000000, 99999999)}",
            phone=random.choice(PHONE_NUMBERS),
            email=f"{first_name.lower()}.{last_name.lower()}@example.com",
            notes=f"Huésped de prueba - {i+1}"
        )
        existing = db.query(Guest).filter(Guest.document_id == guest.document_id).first()
        if not existing:
            db.add(guest)
            guests.append(guest)

    db.commit()
    print(f"✅ {len(guests)} huéspedes creados")
    return guests

def create_rooms(db: Session):
    """Crear habitaciones de prueba"""
    print("📝 Creando habitaciones...")

    rooms = []
    room_configs = [
        ("101", RoomType.single, 100.00),
        ("102", RoomType.single, 100.00),
        ("201", RoomType.double, 150.00),
        ("202", RoomType.double, 150.00),
        ("203", RoomType.double, 160.00),
        ("301", RoomType.suite, 250.00),
        ("302", RoomType.suite, 250.00),
        ("103", RoomType.single, 95.00),
        ("204", RoomType.double, 155.00),
        ("303", RoomType.suite, 280.00),
    ]

    for number, room_type, price in room_configs:
        existing = db.query(Room).filter(Room.number == number).first()
        if not existing:
            room = Room(
                number=number,
                type=room_type,
                status=RoomStatus.available,
                price_bs=price,
                notes=f"Habitación {number} - {room_type.value}"
            )
            db.add(room)
        rooms.append(existing or room)

    db.commit()
    print(f"✅ {len(rooms)} habitaciones (creadas y existentes)")
    return rooms

def create_room_rates(db: Session, rooms: list[Room]):
    """Crear tarifas de habitaciones"""
    print("📝 Creando tarifas de habitaciones...")

    periods = ["day", "week", "fortnight", "month"]
    multipliers = {"day": 1, "week": 6.5, "fortnight": 13, "month": 28}

    for room in rooms:
        for period in periods:
            existing = db.query(RoomRate).filter(
                RoomRate.room_id == room.id,
                RoomRate.period == period
            ).first()

            if not existing:
                rate = RoomRate(
                    room_id=room.id,
                    period=period,
                    price_bs=room.price_bs * multipliers[period]
                )
                db.add(rate)

    db.commit()
    print("✅ Tarifas de habitaciones creadas")

def create_reservations(db: Session, guests: list[Guest], rooms: list[Room]):
    """Crear reservas de prueba"""
    print("📝 Creando reservas...")

    reservations = []
    statuses = [ReservationStatus.pending, ReservationStatus.active, ReservationStatus.checked_out]

    for i in range(15):
        guest = random.choice(guests)
        room = random.choice(rooms)
        status = random.choice(statuses)

        # Generar fechas aleatorias
        if status == ReservationStatus.checked_out:
            start_date = datetime.now() - timedelta(days=random.randint(10, 40))
        elif status == ReservationStatus.active:
            start_date = datetime.now() - timedelta(days=random.randint(1, 5))
        else:  # pending
            start_date = datetime.now() + timedelta(days=random.randint(1, 20))

        period = random.choice(list(Period))
        periods_count = random.randint(1, 3)

        # Calcular end_date
        if period == Period.day:
            end_date = start_date + timedelta(days=periods_count)
        elif period == Period.week:
            end_date = start_date + timedelta(weeks=periods_count)
        elif period == Period.fortnight:
            end_date = start_date + timedelta(weeks=periods_count*2)
        else:  # month
            end_date = start_date + timedelta(days=periods_count*30)

        # Calcular precio
        price_per_day = room.price_bs
        if period == Period.day:
            total_days = periods_count
        elif period == Period.week:
            total_days = periods_count * 7
        elif period == Period.fortnight:
            total_days = periods_count * 14
        else:  # month
            total_days = periods_count * 30

        price_bs = price_per_day * total_days

        reservation = Reservation(
            guest_id=guest.id,
            room_id=room.id,
            start_date=start_date.date(),
            end_date=end_date.date(),
            period=period,
            periods_count=periods_count,
            price_bs=price_bs,
            status=status,
            notes=f"Reserva de prueba #{i+1}"
        )

        db.add(reservation)
        db.flush()
        reservations.append(reservation)

    db.commit()
    print(f"✅ {len(reservations)} reservas creadas")
    return reservations

def create_payments(db: Session, reservations: list[Reservation]):
    """Crear pagos de prueba vinculados a las reservas"""
    print("📝 Creando pagos...")

    payments_created = 0
    payment_methods = ["cash", "card", "transfer", "mobile_payment"]

    for reservation in reservations:
        # Crear un payment pendiente para cada reserva
        status = random.choice([PaymentStatus.pending, PaymentStatus.completed])
        method = random.choice(payment_methods)

        try:
            # Usar raw SQL con parámetros para evitar SQL injection
            sql = text("""
                INSERT INTO payments
                (guest_id, reservation_id, amount, currency, amount_ves, payment_method, status, notes, payment_date, created_at)
                VALUES (:guest_id, :reservation_id, :amount, :currency, :amount_ves, :payment_method, :status, :notes, NOW(), NOW())
            """)
            db.execute(sql, {
                "guest_id": reservation.guest_id,
                "reservation_id": reservation.id,
                "amount": reservation.price_bs,
                "currency": "VES",
                "amount_ves": reservation.price_bs,
                "payment_method": method,
                "status": status.value,  # Convert enum to string
                "notes": f"Pago para reserva #{reservation.id} - Habitación {reservation.room.number}"
            })
            payments_created += 1
        except Exception as e:
            print(f"⚠️  No se pudo crear pago para reserva {reservation.id}: {str(e)}")

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"⚠️  Error en commit de pagos: {str(e)}")

    print(f"✅ {payments_created} pagos creados")

def create_devices(db: Session, guests: list[Guest]):
    """Crear dispositivos de prueba"""
    print("📝 Creando dispositivos...")

    devices = []
    mac_vendors = ["AA:BB:CC", "DD:EE:FF", "11:22:33", "44:55:66", "77:88:99"]

    for i, guest in enumerate(guests[:7]):  # Solo para los primeros 7 huéspedes
        for j in range(random.randint(1, 2)):
            mac = f"{random.choice(mac_vendors)}:{random.randint(0, 255):02X}:{random.randint(0, 255):02X}:{random.randint(0, 255):02X}"

            # Determinar si el dispositivo está online
            is_online = random.choice([True, False])
            last_seen = datetime.now() if is_online else datetime.now() - timedelta(hours=random.randint(1, 24))

            device = Device(
                guest_id=guest.id,
                mac=mac,
                name=f"{random.choice(DEVICE_NAMES)} - {j+1}",
                last_seen=last_seen,
                suspended=False
            )
            db.add(device)
            devices.append(device)

    db.commit()
    print(f"✅ {len(devices)} dispositivos creados")

def create_occupancies(db: Session, reservations: list[Reservation]):
    """Crear ocupancies (huéspedes en habitaciones)"""
    print("📝 Creando ocupancies...")

    occupancies = []
    active_reservations = [r for r in reservations if r.status == ReservationStatus.active]

    for reservation in active_reservations[:5]:  # Solo para algunas reservas activas
        occupancy = Occupancy(
            guest_id=reservation.guest_id,
            room_id=reservation.room_id,
            reservation_id=reservation.id,
            check_in=datetime.combine(reservation.start_date, datetime.min.time()),
            check_out=None  # Aún están en la habitación
        )
        db.add(occupancy)
        occupancies.append(occupancy)

    db.commit()
    print(f"✅ {len(occupancies)} ocupancies creadas")

def seed_database():
    """Función principal para generar todos los datos de prueba"""
    print("\n" + "="*60)
    print("🌱 INICIANDO SEEDING DE DATOS DE PRUEBA")
    print("="*60 + "\n")

    db = SessionLocal()

    try:
        # Crear tablas si no existen
        Base.metadata.create_all(bind=engine)

        # Crear datos
        users = create_users(db)
        guests = create_guests(db)
        rooms = create_rooms(db)
        create_room_rates(db, rooms)
        reservations = create_reservations(db, guests, rooms)
        create_payments(db, reservations)
        create_devices(db, guests)
        create_occupancies(db, reservations)

        print("\n" + "="*60)
        print("✨ SEEDING COMPLETADO EXITOSAMENTE")
        print("="*60)
        print("\n📊 RESUMEN DE DATOS CREADOS:")
        print(f"   • Usuarios: {len(users)}")
        print(f"   • Huéspedes: {len(guests)}")
        print(f"   • Habitaciones: {len(rooms)}")
        print(f"   • Reservas: {len(reservations)}")
        print(f"   • Pagos: {len(reservations)}")
        print(f"   • Dispositivos: {db.query(Device).count()}")
        print(f"   • Ocupancies: {db.query(Occupancy).count()}")

        print("\n🔑 CREDENCIALES DE PRUEBA:")
        print("   Admin:")
        print("      📧 Email: admin@hostal.com")
        print("      🔐 Contraseña: admin123")
        print("\n   Recepcionista:")
        print("      📧 Email: recepcionista@hostal.com")
        print("      🔐 Contraseña: recep123")
        print("\n")

    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
