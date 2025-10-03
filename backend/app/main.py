# app/main.py
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.common.errors import register_exception_handlers
from app.core.settings import settings
from app.routers import (
    auth,
    devices,
    guests,
    health,
    reservations,
    room_rates,
    rooms,
    users,
)

# 1) Instancia de FastAPI
app = FastAPI(title="Hostal API (with auth & roles)")

# 2) CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,  # viene de app/core/settings.py
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 3) Security headers muy básicos
async def security_headers_mw(request, call_next):
    resp = await call_next(request)
    resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    resp.headers.setdefault("X-Frame-Options", "DENY")
    resp.headers.setdefault("Referrer-Policy", "no-referrer")
    return resp


app.add_middleware(BaseHTTPMiddleware, dispatch=security_headers_mw)

# 4) Handlers de errores comunes
register_exception_handlers(app)

# 5) Montaje de routers
# Si cada router ya define su propio prefix en su archivo, NO repetir aquí.
app.include_router(health.router)  # normalmente sin prefix o con /health en el router
app.include_router(auth.router)  # si el router define prefix="/auth"
app.include_router(users.router)  # si define prefix="/users"
app.include_router(guests.router)  # si define prefix="/guests"
app.include_router(rooms.router)  # si define prefix="/rooms"
app.include_router(room_rates.router)  # si define prefix="/rooms" o similar dentro
app.include_router(reservations.router)  # si define prefix="/reservations"
app.include_router(devices.router)  # si define prefix="/guests/{guest_id}/devices" o similar
