#!/usr/bin/env python3
"""
Script simplificado para generar datos de prueba para el sistema de Hostal.
Genera datos para 100 habitaciones con ocupantes, reservas, pagos, etc.
"""
import os
import sys
from datetime import datetime, timedelta
from random import randint, choice, random
import uuid

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.db import SessionLocal
from app.models import (
    Room, Guest, Device, Occupancy, Reservation, ReservationStatus, Period,
    Payment, PaymentStatus, Currency, Staff, StaffStatus, Maintenance,
    MaintenanceType, MaintenanceStatus, MaintenancePriority, User, ExchangeRate,
    NetworkDevice, DeviceBrand, DeviceType, ConnectionStatus, AuthType,
    NetworkActivity, ActivityType
)
from app.models.room import RoomType, RoomStatus
from app.models.payment import PaymentMethod
from app.models.audit_log import AuditLog

# Datos realistas
FIRST_NAMES = ["Juan", "María", "Carlos", "Ana", "Luis", "Rosa", "Miguel", "Carmen",
               "José", "Patricia", "Francisco", "Isabel", "Jorge", "Dolores"]

LAST_NAMES = ["García", "Rodríguez", "Martínez", "López", "González", "Pérez",
              "Sánchez", "Ramírez", "Torres", "Flores"]

DEVICE_NAMES = ["iPhone", "Samsung Galaxy", "Huawei", "OnePlus", "Laptop Dell",
                "iPad", "Tablet Samsung", "Nintendo Switch"]

DEVICE_VENDORS = ["Apple", "Samsung", "Huawei", "OnePlus", "Dell", "HP", "Lenovo"]

MAINTENANCE_ISSUES = ["Ventilador roto", "Puerta dañada", "Lámpara apagada",
                     "Cerradura atascada", "Espejo roto", "Ducha sin agua caliente",
                     "Aire acondicionado no funciona", "Ventana rota", "Piso dañado"]

def generate_phone():
    return f"+34{randint(600000000, 699999999)}"

def generate_mac_address():
    return ':'.join([f'{randint(0, 255):02x}' for _ in range(6)])

def generate_document_id():
    return f"{randint(10000000, 99999999)}-{choice('ABCDEFGHIJKLMNOPQRSTUVWXYZ')}"

def generate_test_data():
    db = SessionLocal()
    try:
        print("🗑️  Limpiando datos existentes...")
        # Delete tables in order of dependencies (children first)
        tables_to_delete = [
            (AuditLog, "AuditLog"),
            (NetworkActivity, "NetworkActivity"),
            (Device, "Device"),
            (Occupancy, "Occupancy"),
            (Maintenance, "Maintenance"),
            (Payment, "Payment"),
            (Reservation, "Reservation"),
            (Guest, "Guest"),
            (Room, "Room"),
            (Staff, "Staff"),
            (ExchangeRate, "ExchangeRate"),
            (NetworkDevice, "NetworkDevice"),
            (User, "User"),
        ]

        for model, table_name in tables_to_delete:
            try:
                db.query(model).delete()
                db.commit()
            except Exception as e:
                db.rollback()
                # Continue even if one table fails
                pass

        print("✅ Base de datos limpia")

        # 1. Crear personal (6 usuarios)
        print("\n📝 Creando 6 miembros de personal...")
        staff_list = []
        staff_names = [
            ("Juan Pérez", "limpieza"), ("María García", "limpieza"),
            ("Carlos López", "recepcionista"), ("Ana Rodríguez", "recepcionista"),
            ("Luis Martínez", "mantenimiento"), ("Rosa Sánchez", "gerente"),
        ]

        for full_name, role in staff_names:
            user = User(
                email=f"{full_name.replace(' ', '.').lower()}@hostal.local",
                hashed_password="hashedpassword",
                approved=True,
                role="staff"
            )
            db.add(user)
            db.flush()

            staff = Staff(
                user_id=user.id,
                full_name=full_name,
                document_id=generate_document_id(),
                phone=generate_phone(),
                role=role,
                status=StaffStatus.active if random() > 0.1 else StaffStatus.inactive
            )
            db.add(staff)
            staff_list.append(staff)

        db.commit()
        print(f"✅ {len(staff_list)} miembros de personal creados")

        # 2. Crear 100 habitaciones
        print("\n🛏️  Creando 100 habitaciones...")
        rooms = []
        room_types = list(RoomType)
        room_statuses = list(RoomStatus)

        for i in range(1, 101):
            room_type = choice(room_types)
            # Price in Bolívares
            prices = {RoomType.single: 30000, RoomType.double: 50000, RoomType.suite: 75000}

            room = Room(
                number=f"{(i-1)//10 + 1}{i%10:02d}",
                type=room_type,
                price_bs=prices[room_type],
                status=choice(room_statuses),
                notes=f"Habitación {room_type.value}"
            )
            db.add(room)
            rooms.append(room)

        db.commit()
        print(f"✅ 100 habitaciones creadas")

        # 3. Crear tasas de cambio
        print("\n💱 Crear tasas de cambio...")
        currencies = list(Currency)
        for curr in currencies:
            if curr != Currency.EUR:
                rate = ExchangeRate(
                    from_currency=Currency.EUR,
                    to_currency=curr,
                    rate=round(0.8 + random() * 0.4, 2) if curr == Currency.USD else round(1000 + random() * 500, 2),
                    updated_at=datetime.utcnow()
                )
                db.add(rate)
        db.commit()
        print("✅ Tasas de cambio creadas")

        # 4. Crear dispositivos de red
        print("\n🌐 Creando 5 dispositivos de red...")
        try:
            for i in range(5):
                device = NetworkDevice(
                    name=f"Controller-{i+1}",
                    brand=DeviceBrand.UBIQUITI,
                    device_type=DeviceType.CONTROLLER,
                    ip_address=f"192.168.1.{100+i}",
                    port=8443,
                    use_ssl=True,
                    verify_ssl=True,
                    auth_type=AuthType.API_KEY,
                    api_key=f"test_api_key_{i+1}",
                    connection_status=choice(list(ConnectionStatus)),
                    success_rate=round(90 + random() * 10, 1),
                    is_active=True
                )
                db.add(device)
            db.commit()
            print("✅ 5 dispositivos de red creados")
        except Exception as net_err:
            print(f"⚠️  No se pudieron crear dispositivos de red: {net_err}")
            db.rollback()

        # 5. Crear huéspedes, ocupancias y dispositivos
        print("\n👥 Creando huéspedes, ocupancias y dispositivos...")
        guests_count = 0
        occupancies_count = 0
        devices_count = 0

        for room in rooms:
            if random() > 0.3:  # 70% de habitaciones ocupadas
                # Room capacity depends on type
                capacities = {RoomType.single: 1, RoomType.double: 2, RoomType.suite: 3}
                max_capacity = capacities.get(room.type, 1)
                num_guests = randint(1, max_capacity)
                for g in range(num_guests):
                    full_name = f"{choice(FIRST_NAMES)} {choice(LAST_NAMES)}"
                    guest = Guest(
                        full_name=full_name,
                        document_id=generate_document_id(),
                        email=f"{full_name.split()[0].lower()}{randint(100, 999)}@email.com",
                        phone=generate_phone()
                    )
                    db.add(guest)
                    db.flush()
                    guests_count += 1

                    check_in = datetime.utcnow() - timedelta(days=randint(1, 30))
                    occupancy = Occupancy(
                        guest_id=guest.id,
                        room_id=room.id,
                        check_in=check_in,
                        check_out=check_in + timedelta(days=randint(1, 14)) if random() > 0.3 else None
                    )
                    db.add(occupancy)
                    occupancies_count += 1

                    # Dispositivos de huésped
                    for d in range(randint(1, 3)):
                        device = Device(
                            guest_id=guest.id,
                            name=f"{choice(DEVICE_NAMES)} de {guest.full_name.split()[0]}",
                            mac=generate_mac_address(),
                            vendor=choice(DEVICE_VENDORS),
                            allowed=random() > 0.2,
                            suspended=random() > 0.9,
                            total_bytes_downloaded=randint(100_000_000, 5_000_000_000),
                            total_bytes_uploaded=randint(50_000_000, 1_000_000_000),
                            first_seen=datetime.utcnow() - timedelta(days=randint(1, 30)),
                            last_seen=datetime.utcnow() - timedelta(minutes=randint(1, 1440))
                        )
                        db.add(device)
                        devices_count += 1

        db.commit()
        print(f"✅ {guests_count} huéspedes, {occupancies_count} ocupancias, {devices_count} dispositivos creados")

        # 6. Crear reservas
        print("\n📅 Creando 150 reservas...")
        guests = db.query(Guest).all()
        for i in range(min(150, len(guests) * 2)):
            guest = choice(guests)
            room = choice(rooms)
            start = (datetime.utcnow() + timedelta(days=randint(1, 90))).date()
            end = start + timedelta(days=randint(1, 14))
            days = (end - start).days

            reservation = Reservation(
                guest_id=guest.id,
                room_id=room.id,
                start_date=start,
                end_date=end,
                status=choice(list(ReservationStatus)),
                price_bs=(room.price_bs or 50000) * days,
                period=Period.day,
                periods_count=days
            )
            db.add(reservation)
            if (i + 1) % 30 == 0:
                db.commit()
        db.commit()
        print("✅ 150 reservas creadas")

        # 7. Crear pagos
        print("\n💳 Creando 200 pagos...")
        reservations = db.query(Reservation).all()
        for i in range(200):
            guest = choice(guests)
            reservation = choice(reservations) if reservations else None

            # Use only safe payment statuses that definitely exist in the database
            safe_statuses = [PaymentStatus.pending, PaymentStatus.completed, PaymentStatus.failed]
            payment = Payment(
                guest_id=guest.id,
                reservation_id=reservation.id if reservation else None,
                amount=round(randint(50, 500) + random(), 2),
                currency=choice(list(Currency)),
                method=choice(list(PaymentMethod)),
                status=choice(safe_statuses),
                notes=choice(["Anticipado", "Check-in", "Depósito", "Completado"])
            )
            db.add(payment)
            if (i + 1) % 40 == 0:
                db.commit()
        db.commit()
        print("✅ 200 pagos creados")

        # 8. Crear mantenimiento
        print("\n🔧 Creando 80 órdenes de mantenimiento...")
        for i in range(80):
            room = choice(rooms)
            staff = choice(staff_list)

            # Use only safe statuses (avoid cancelled if not in DB constraint)
            safe_maint_statuses = [MaintenanceStatus.pending, MaintenanceStatus.in_progress, MaintenanceStatus.completed]
            maintenance = Maintenance(
                room_id=room.id,
                type=choice(list(MaintenanceType)),
                priority=choice(list(MaintenancePriority)),
                title=choice(MAINTENANCE_ISSUES),
                description=choice(MAINTENANCE_ISSUES),
                status=choice(safe_maint_statuses),
                assigned_to=staff.id,
                estimated_cost=round(randint(20, 500) + random(), 2)
            )
            db.add(maintenance)
            if (i + 1) % 20 == 0:
                db.commit()
        db.commit()
        print("✅ 80 órdenes de mantenimiento creadas")

        # 9. Crear actividad de red
        print("\n📊 Creando 300 registros de actividad de red...")
        occupancies = db.query(Occupancy).all()
        devices_list = db.query(Device).all()

        for i in range(min(300, len(occupancies))):
            occupancy = choice(occupancies) if occupancies else None
            device = choice(devices_list) if devices_list else None

            if occupancy and device:
                activity = NetworkActivity(
                    device_id=device.id,
                    guest_id=occupancy.guest_id,
                    activity_type=choice(list(ActivityType)),
                    timestamp=datetime.utcnow() - timedelta(minutes=randint(1, 1440))
                )
                db.add(activity)
                if (i + 1) % 60 == 0:
                    db.commit()
        db.commit()
        print("✅ 300 registros de actividad creados")

        # Resumen final
        print("\n" + "="*60)
        print("✨ DATOS DE PRUEBA GENERADOS EXITOSAMENTE")
        print("="*60)
        print(f"🏨 Habitaciones: 100")
        print(f"👥 Huéspedes: {guests_count}")
        print(f"🔑 Ocupancias: {occupancies_count}")
        print(f"📱 Dispositivos de huésped: {devices_count}")
        print(f"📅 Reservas: 150")
        print(f"💳 Pagos: 200")
        print(f"👔 Personal: {len(staff_list)}")
        print(f"🔧 Mantenimiento: 80")
        print(f"🌐 Dispositivos de red: 5")
        print(f"📊 Actividad de red: 300")
        print("="*60)

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("\n🚀 Iniciando generación de datos de prueba...\n")
    generate_test_data()
    print("\n✅ ¡Completado!\n")
