# app/main.py
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.common.errors import register_exception_handlers
from app.core.logging import setup_logging
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

setup_logging()
ALLOWED_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]


# --- Middlewares ---
async def security_headers_mw(request, call_next):
    resp = await call_next(request)
    resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    resp.headers.setdefault("X-Frame-Options", "DENY")
    resp.headers.setdefault("Referrer-Policy", "no-referrer")
    return resp


# --- App ---
app = FastAPI(title="Hostal API (with auth & roles)")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security headers
app.add_middleware(BaseHTTPMiddleware, dispatch=security_headers_mw)

# Handlers de error globales
register_exception_handlers(app)

# --- Routers ---
# Cada router ya define su propio prefix internamente.
app.include_router(health.router)  # /health
app.include_router(auth.router)  # /auth/...
app.include_router(users.router)  # /users/...
app.include_router(guests.router)  # /guests/...
app.include_router(rooms.router)  # /rooms/...
app.include_router(room_rates.router)  # /rooms/{room_id}/rates ...
app.include_router(reservations.router)  # /reservations/...
app.include_router(devices.router)  # /guests/{guest_id}/devices/...
