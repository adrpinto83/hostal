#!/bin/bash

# Script para crear datos de prueba en el sistema

echo "🧪 Creando datos de prueba para el sistema..."
echo ""

cd backend
source venv/bin/activate

python << 'EOF'
from app.core.db import SessionLocal
from app.models.room import Room, RoomStatus
from app.models.guest import Guest
from app.models.staff import Staff, StaffRole, StaffStatus
from datetime import date

db = SessionLocal()

print("Creando habitaciones de prueba...")
rooms = [
    Room(number="101", status=RoomStatus.available, notes="Habitación con vista al jardín"),
    Room(number="102", status=RoomStatus.available, notes="Habitación estándar"),
    Room(number="103", status=RoomStatus.available, notes="Habitación con balcón"),
    Room(number="201", status=RoomStatus.cleaning, notes="Habitación segundo piso"),
    Room(number="202", status=RoomStatus.maintenance, notes="Aire acondicionado en reparación"),
]

for room in rooms:
    existing = db.query(Room).filter(Room.number == room.number).first()
    if not existing:
        db.add(room)
        print(f"  ✓ Habitación {room.number} creada")

db.commit()

print("\nCreando huéspedes de prueba...")
guests = [
    Guest(
        full_name="Juan Carlos Pérez",
        document_id="V-12345678",
        phone="+58 412 1234567",
        email="juan.perez@example.com",
        notes="Cliente frecuente"
    ),
    Guest(
        full_name="María González",
        document_id="V-23456789",
        phone="+58 414 2345678",
        email="maria.gonzalez@example.com"
    ),
    Guest(
        full_name="Pedro Ramírez",
        document_id="V-34567890",
        phone="+58 424 3456789",
        email="pedro.ramirez@example.com"
    ),
]

for guest in guests:
    existing = db.query(Guest).filter(Guest.document_id == guest.document_id).first()
    if not existing:
        db.add(guest)
        print(f"  ✓ Huésped {guest.full_name} creado")

db.commit()

print("\nCreando personal de prueba...")
staff_members = [
    Staff(
        full_name="Ana Martínez",
        document_id="V-45678901",
        phone="+58 412 4567890",
        email="ana.martinez@hostal.com",
        role=StaffRole.RECEPCIONISTA,
        status=StaffStatus.ACTIVE,
        hire_date=date(2024, 1, 15),
        salary=350.00
    ),
    Staff(
        full_name="Carlos López",
        document_id="V-56789012",
        phone="+58 414 5678901",
        email="carlos.lopez@hostal.com",
        role=StaffRole.MANTENIMIENTO,
        status=StaffStatus.ACTIVE,
        hire_date=date(2024, 2, 1),
        salary=400.00
    ),
    Staff(
        full_name="Luisa Fernández",
        document_id="V-67890123",
        phone="+58 424 6789012",
        email="luisa.fernandez@hostal.com",
        role=StaffRole.LIMPIEZA,
        status=StaffStatus.ACTIVE,
        hire_date=date(2024, 1, 20),
        salary=300.00
    ),
]

for staff in staff_members:
    existing = db.query(Staff).filter(Staff.document_id == staff.document_id).first()
    if not existing:
        db.add(staff)
        print(f"  ✓ Personal {staff.full_name} creado")

db.commit()
db.close()

print("\n✅ Datos de prueba creados exitosamente!")
print("\n📊 Resumen:")
print(f"  • 5 habitaciones")
print(f"  • 3 huéspedes")
print(f"  • 3 empleados")
print("\n💡 Ahora puedes ver estos datos en el frontend")
EOF

cd ..
