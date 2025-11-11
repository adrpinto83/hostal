# app/main.py
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette_prometheus import PrometheusMiddleware, metrics

from app.core.config import settings
from app.core.limiter import limiter  # <--- Importar desde el nuevo archivo
from app.core.logging import setup_logging
from app.core.middleware import LoggingMiddleware
from app.routers import reservations
from app.routers.api import api_router

app = FastAPI(
    title="Hostal API",
    description="API REST para gestión de hostal con reservaciones, huéspedes y habitaciones",
    version="1.0.0",
    debug=settings.DEBUG,
)

# Configurar directorio de uploads para servir archivos estáticos
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


@app.on_event("startup")
async def startup_event():
    """Validaciones y configuración al iniciar la aplicación."""
    import structlog

    log = structlog.get_logger()

    log.info(
        "Starting Hostal API",
        environment=settings.APP_ENV,
        debug=settings.DEBUG,
        cors_origins=settings.get_cors_origins(),
    )

    # Validar configuración crítica en producción
    if settings.APP_ENV == "prod":
        if settings.SECRET_KEY in ("change-me", "change-me-in-production"):
            log.error("CRITICAL: SECRET_KEY not configured for production")
            raise ValueError("SECRET_KEY must be set in production")

        if "*" in settings.get_cors_origins():
            log.warning("WARNING: CORS allows all origins in production - security risk!")

    log.info("Hostal API started successfully")


# Registrar routers y configurar logging después de crear la app
app.include_router(reservations.router, prefix="/api/v1")
setup_logging()

# Asigna el limitador al estado de la app y añade el manejador de excepciones
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Middlewares
app.add_middleware(LoggingMiddleware)
app.add_middleware(PrometheusMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),  # Configuración desde settings
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept"],
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

# Montar carpeta de uploads como archivos estáticos
# IMPORTANTE: Esto debe ir al final, después de todos los routers
app.mount("/media", StaticFiles(directory=str(UPLOAD_DIR)), name="media")
