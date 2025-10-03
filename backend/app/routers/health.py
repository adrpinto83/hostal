from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.sql import text

from ..core.db import get_db

router = APIRouter()


@router.get("/healthz", tags=["Health"])
def liveness_check():
    """
    Verifica que la aplicación está corriendo (Liveness Probe).
    """
    return {"status": "ok"}


@router.get("/readyz", tags=["Health"])
def readiness_check(db: Session = Depends(get_db)):
    """
    Verifica que la aplicación puede conectarse a sus dependencias, como la BD (Readiness Probe).
    """
    try:
        # Ejecuta una consulta simple para verificar la conexión a la base de datos
        db.execute(text("SELECT 1"))
        return {"status": "ready"}
    except Exception as e:
        # Si la conexión a la BD falla, lanza un error 503
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database connection failed: {e}",
        ) from e
