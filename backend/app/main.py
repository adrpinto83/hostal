# app/main.py
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette_prometheus import PrometheusMiddleware, metrics

from app.core.limiter import limiter  # <--- Importar desde el nuevo archivo
from app.core.logging import setup_logging
from app.core.middleware import LoggingMiddleware
from app.routers.api import api_router

setup_logging()

app = FastAPI(title="Hostal API")

# Asigna el limitador al estado de la app y añade el manejador de excepciones
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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
app.include_router(api_router)
