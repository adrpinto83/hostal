#!/bin/bash

# Script para crear datos de prueba completos en el sistema

echo "🧪 Creando datos de prueba para el sistema..."
echo ""

cd backend
source venv/bin/activate

python << 'EOF'
from app.core.db import SessionLocal
from app.models.room import Room, RoomStatus, RoomType
from app.models.guest import Guest
from app.models.staff import Staff, StaffRole, StaffStatus
from app.models.occupancy import Occupancy
from app.models.maintenance import Maintenance, MaintenanceStatus, MaintenancePriority, MaintenanceType
from app.models.room_rate import RoomRate
from app.models.reservation import Period
from datetime import date, datetime, timedelta

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
            db.flush() # Flush to get the ID for the rates
            print(f"  ✓ Habitación {room.number} creada")
        else:
            room = existing
            print(f"  - Habitación {room.number} ya existe")
        rooms[room.number] = room
    db.commit()

    print("\nCreando tarifas de habitación de prueba...")
    for room_number, room_obj in rooms.items():
        rates_data = [
            {'period': Period.day, 'price_bs': 25.00 if room_obj.type == RoomType.single else (35.00 if room_obj.type == RoomType.double else 50.00)},
            {'period': Period.week, 'price_bs': 150.00 if room_obj.type == RoomType.single else (210.00 if room_obj.type == RoomType.double else 300.00)},
            {'period': Period.month, 'price_bs': 500.00 if room_obj.type == RoomType.single else (700.00 if room_obj.type == RoomType.double else 1000.00)},
        ]
        for rate_data in rates_data:
            existing_rate = db.query(RoomRate).filter_by(room_id=room_obj.id, period=rate_data['period']).first()
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


    print("\nCreando ocupaciones de prueba...")
    occupancies_data = [
        {
            "room_id": rooms["101"].id, "guest_id": guests["V-12345678"].id,
            "check_in": datetime.utcnow() - timedelta(days=2), "check_out": None,
            "amount_paid_usd": 150.00, "payment_method": "Tarjeta de Crédito"
        },
        {
            "room_id": rooms["102"].id, "guest_id": guests["V-23456789"].id,
            "check_in": datetime.utcnow() - timedelta(days=5), "check_out": datetime.utcnow() - timedelta(days=1),
            "amount_paid_usd": 200.00, "payment_method": "Efectivo"
        },
    ]
    for occ_data in occupancies_data:
        # Simple check to avoid duplicates
        existing = db.query(Occupancy).filter_by(room_id=occ_data["room_id"], check_out=None).first()
        if not existing:
            occupancy = Occupancy(**occ_data)
            db.add(occupancy)
            # Update room status
            room = db.get(Room, occ_data["room_id"])
            if room and not occ_data["check_out"]:
                room.status = RoomStatus.occupied
            print(f"  ✓ Ocupación creada para habitación {room.number}")
    db.commit()


    print("\nCreando tareas de mantenimiento de prueba...")
    maintenance_staff = staff_members.get(StaffRole.mantenimiento)
    maintenances_data = [
        {
            "room_id": rooms["202"].id, "type": MaintenanceType.aire_acondicionado, "priority": MaintenancePriority.high,
            "title": "Reparar aire acondicionado", "description": "El A/C no enfría, hace ruido.",
            "status": MaintenanceStatus.pending, "assigned_to": maintenance_staff.id if maintenance_staff else None
        },
        {
            "room_id": rooms["201"].id, "type": MaintenanceType.limpieza_profunda, "priority": MaintenancePriority.low,
            "title": "Limpieza profunda de alfombra", "description": "Mancha de café en la alfombra.",
            "status": MaintenanceStatus.completed, "completed_at": datetime.utcnow()
        },
    ]
    for maint_data in maintenances_data:
        existing = db.query(Maintenance).filter_by(room_id=maint_data["room_id"], title=maint_data["title"]).first()
        if not existing:
            maintenance = Maintenance(**maint_data)
            db.add(maintenance)
            print(f"  ✓ Tarea de mantenimiento '{maint_data['title']}' creada")
    db.commit()

    print("\n✅ Datos de prueba creados exitosamente!")
    print("\n📊 Resumen:")
    print(f"  • {db.query(Room).count()} habitaciones")
    print(f"  • {db.query(RoomRate).count()} tarifas de habitación")
    print(f"  • {db.query(Guest).count()} huéspedes")
    print(f"  • {db.query(Staff).count()} empleados")
    print(f"  • {db.query(Occupancy).count()} registros de ocupación")
    print(f"  • {db.query(Maintenance).count()} tareas de mantenimiento")
    print("\n💡 Ahora puedes ver estos datos en el frontend")

finally:
    db.close()
EOF

cd ..