# app/main.py
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.core.logging import setup_logging
from app.core.middleware import LoggingMiddleware
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

# 1) Configurar el logging ANTES de crear la app
setup_logging()

# 2) Instancia de FastAPI
app = FastAPI(title="Hostal API")

# 3) Añadir Middlewares
app.add_middleware(LoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Ajusta esto en producción
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- INICIO DE LA CORRECCIÓN ---
# 3.1) Middleware para añadir cabeceras de seguridad
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    return response


# --- FIN DE LA CORRECCIÓN ---


# 4) Montaje de routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(guests.router)
app.include_router(rooms.router)
app.include_router(room_rates.router)
app.include_router(reservations.router)
app.include_router(devices.router)
