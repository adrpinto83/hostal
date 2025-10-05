# app/main.py
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette_prometheus import PrometheusMiddleware, metrics

from app.core.logging import setup_logging
from app.core.middleware import LoggingMiddleware
from app.routers.api import api_router  # <--- 1. Importamos el nuevo router principal

# 2. (Opcional) Eliminamos las líneas de depuración que ya no necesitamos
# from app.core.config import settings
# print(...)

setup_logging()

app = FastAPI(title="Hostal API")

# Middlewares
app.add_middleware(LoggingMiddleware)
app.add_middleware(PrometheusMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Ajusta esto en producción
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
app.add_route("/metrics", metrics)

# 3. Incluimos ÚNICAMENTE el router principal
app.include_router(api_router)
