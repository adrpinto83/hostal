# app/main.py
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette_prometheus import PrometheusMiddleware, metrics  # <-- 1. Importar

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

setup_logging()

app = FastAPI(title="Hostal API")

# Middlewares
app.add_middleware(LoggingMiddleware)
app.add_middleware(PrometheusMiddleware)  # <-- 2. Añadir el middleware de Prometheus
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    return response


# Endpoints
app.add_route("/metrics", metrics)  # <-- 3. Añadir el endpoint /metrics

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(guests.router)
app.include_router(rooms.router)
app.include_router(room_rates.router)
app.include_router(reservations.router)
app.include_router(devices.router)
