from fastapi import APIRouter, HTTPException, status
from sqlalchemy.sql import text

# Importamos el 'engine' directamente
from ..core.db import engine

router = APIRouter(tags=["Health"])


@router.get(
    "/healthz",
    summary="Verificar si la aplicación está activa (Liveness)",
    description="Endpoint simple que devuelve un 200 OK si el proceso de la API está corriendo.",
)
def liveness_check():
    return {"status": "ok"}


@router.get(
    "/readyz",
    summary="Verificar si la aplicación está lista para recibir peticiones (Readiness)",
    description="Verifica que la aplicación puede conectarse a sus dependencias (como la base de datos). Devuelve un 503 si la conexión falla.",
)
def readiness_check():
    """
    Verifica que la aplicación puede conectarse a sus dependencias (como la base de datos).
    Devuelve un 503 si la conexión falla.
    """
    print("--> Ejecutando nueva prueba de readiness...")  # Mensaje para depuración
    try:
        # Intenta obtener una conexión del pool. Esto fallará si la BD no está disponible.
        connection = engine.connect()
        # Opcional: ejecuta una consulta simple para ser extra seguro.
        connection.execute(text("SELECT 1"))
        # Cierra la conexión inmediatamente para devolverla al pool.
        connection.close()
        return {"status": "ready"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database connection failed: {e}",
        ) from e
