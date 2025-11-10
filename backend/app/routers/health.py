import time

from fastapi import APIRouter, HTTPException, status
from sqlalchemy.sql import text

# Importamos el 'engine' directamente
from ..core.config import settings
from ..core.db import engine

router = APIRouter(tags=["Health"])

# Timestamp de inicio de la aplicación
START_TIME = time.time()


@router.get(
    "/healthz",
    summary="Verificar si la aplicación está activa (Liveness)",
    description="Endpoint simple que devuelve un 200 OK si el proceso de la API está corriendo.",
)
def liveness_check():
    """Health check básico para verificar que la aplicación está corriendo."""
    uptime_seconds = int(time.time() - START_TIME)
    return {
        "status": "ok",
        "uptime_seconds": uptime_seconds,
        "environment": settings.APP_ENV,
        "version": "1.0.0",
    }


@router.get(
    "/readyz",
    summary="Verificar si la aplicación está lista para recibir peticiones (Readiness)",
    description="Verifica que la aplicación puede conectarse a sus dependencias (como la base de datos). Devuelve un 503 si la conexión falla.",
)
def readiness_check():
    """
    Verifica que la aplicación puede conectarse a sus dependencias.
    Incluye verificación de base de datos.
    Devuelve un 503 si alguna dependencia falla.
    """
    checks = {"database": "unknown"}

    # Check de base de datos
    try:
        start = time.time()
        connection = engine.connect()
        connection.execute(text("SELECT 1"))
        connection.close()
        db_latency_ms = round((time.time() - start) * 1000, 2)
        checks["database"] = "ok"
        checks["db_latency_ms"] = db_latency_ms
    except Exception as e:
        checks["database"] = "failed"
        checks["database_error"] = str(e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"status": "not_ready", "checks": checks},
        ) from e

    return {"status": "ready", "checks": checks}
