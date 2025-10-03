from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.sql import text

from ..core.db import get_db

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
def readiness_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ready"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database connection failed: {e}",
        ) from e
