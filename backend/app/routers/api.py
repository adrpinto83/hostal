# app/routers/api.py
from fastapi import APIRouter

from . import (
    auth,
    devices,
    exchange_rates,
    guests,
    health,
    internet_control,
    media,
    reservations,
    room_rates,
    rooms,
    users,
)

api_router = APIRouter(prefix="/api/v1")

# Incluir todos los routers individuales bajo el prefijo /api/v1
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(guests.router)
api_router.include_router(rooms.router)
api_router.include_router(room_rates.router)
api_router.include_router(reservations.router)
api_router.include_router(devices.router)
api_router.include_router(internet_control.router)  # Control de internet
api_router.include_router(exchange_rates.router)  # Tasas de cambio
api_router.include_router(media.router)  # Gestión de archivos
