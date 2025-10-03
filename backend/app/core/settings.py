# app/core/settings.py
from __future__ import annotations

import os
from typing import List


class Settings:
    # Clave/algoritmo JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me-in-prod")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")

    # Expiración del token en minutos
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

    # CORS
    # Puedes separar múltiples orígenes por coma en ALLOWED_ORIGINS
    _origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
    ALLOWED_ORIGINS: List[str] = [o.strip() for o in _origins.split(",") if o.strip()]


settings = Settings()
