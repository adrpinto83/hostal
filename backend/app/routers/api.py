# app/routers/api.py
from fastapi import APIRouter

from . import auth, devices, guests, health, reservations, room_rates, rooms, users

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
