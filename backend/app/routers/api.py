# app/routers/api.py
from fastapi import APIRouter

from . import (
    audit,
    auth,
    backup,
    devices,
    exchange_rates,
    guests,
    health,
    internet_control,
    maintenance,
    media,
    network_devices,
    occupancy,
    payments,
    reservations,
    room_rates,
    rooms,
    staff,
    users,
)

api_router = APIRouter(prefix="/api/v1")

# Incluir todos los routers individuales bajo el prefijo /api/v1
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(audit.router)  # Auditoría - Solo admin
api_router.include_router(backup.router)  # Respaldo y restauración - Solo admin
api_router.include_router(users.router)
api_router.include_router(guests.router)
api_router.include_router(rooms.router)
api_router.include_router(room_rates.router)
api_router.include_router(reservations.router)
api_router.include_router(devices.router)
api_router.include_router(devices.devices_router)  # Device suspension management
api_router.include_router(internet_control.router)  # Control de internet
api_router.include_router(network_devices.router)  # Dispositivos de red e integración
api_router.include_router(exchange_rates.router)  # Tasas de cambio
api_router.include_router(payments.router)  # Pagos multimoneda
api_router.include_router(media.router)  # Gestión de archivos
api_router.include_router(staff.router)  # Gestión de personal
api_router.include_router(occupancy.router)  # Check-in/Check-out
api_router.include_router(maintenance.router)  # Mantenimiento
