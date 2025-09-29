# app/core/config.py
from __future__ import annotations
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # ---- Auth / JWT ----
    secret_key: str = Field(
        default="change-me",
        validation_alias="JWT_SECRET"  # preferida
    )
    # aceptar alias antiguos también
    jwt_secret: Optional[str] = None  # alias legacy; si llega, lo usaremos abajo

    algorithm: str = Field(
        default="HS256",
        validation_alias="ALGORITHM"
    )
    access_token_expire_minutes: int = Field(
        default=120,
        validation_alias="ACCESS_TOKEN_EXPIRE_MINUTES"
    )
    # alias legacy (por si tu .env trae jwt_expire_minutes)
    jwt_expire_minutes: Optional[int] = None

    # ---- DB ----
    database_url: Optional[str] = Field(
        default=None,
        validation_alias="DATABASE_URL"
    )

    # alias legacy (construiremos URL con estos si no hay DATABASE_URL)
    postgres_user: Optional[str] = None
    postgres_password: Optional[str] = None
    postgres_db: Optional[str] = None
    postgres_host: Optional[str] = None
    postgres_port: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",              # <- ignora otras claves en .env
        validate_default=True,
    )

    # Post-procesamiento para compatibilidad con legacy
    def finalize(self) -> "Settings":
        # jwt_* legacy
        if self.jwt_secret and self.secret_key == "change-me":
            object.__setattr__(self, "secret_key", self.jwt_secret)
        if self.jwt_expire_minutes and self.access_token_expire_minutes == 120:
            object.__setattr__(self, "access_token_expire_minutes", self.jwt_expire_minutes)

        # Si no hay DATABASE_URL, intenta construirla con los postgres_*
        if not self.database_url:
            u = self.postgres_user or "hostal"
            p = self.postgres_password or "hostal_pass"
            d = self.postgres_db or "hostal_db"
            h = self.postgres_host or "127.0.0.1"
            port = self.postgres_port or "5432"
            url = f"postgresql+psycopg://{u}:{p}@{h}:{port}/{d}"
            object.__setattr__(self, "database_url", url)
        return self


# instancia global
settings = Settings().finalize()
