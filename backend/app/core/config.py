# app/core/config.py
from __future__ import annotations

from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ---- Meta / entorno ----
    app_env: str = Field(default="dev", validation_alias="APP_ENV")  # dev | test | prod
    debug: bool = Field(default=True, validation_alias="DEBUG")

    # ---- Auth / JWT ----
    secret_key: str = Field(default="change-me", validation_alias="JWT_SECRET")
    # Aliases legacy
    jwt_secret: Optional[str] = None

    algorithm: str = Field(default="HS256", validation_alias="ALGORITHM")
    access_token_expire_minutes: int = Field(
        default=120, validation_alias="ACCESS_TOKEN_EXPIRE_MINUTES"
    )
    # Alias legacy
    jwt_expire_minutes: Optional[int] = None

    # ---- DB ----
    database_url: Optional[str] = Field(default=None, validation_alias="DATABASE_URL")

    # Aliases legacy (si no hay DATABASE_URL)
    postgres_user: Optional[str] = None
    postgres_password: Optional[str] = None
    postgres_db: Optional[str] = None
    postgres_host: Optional[str] = None
    postgres_port: Optional[str] = None

    model_config = SettingsConfigDict(
        # Nota: si quieres desactivar el .env en prod estrictamente,
        # deja env_file=".env" y no montes ese archivo en prod (12-factor),
        # o usa el patrón comentado más abajo.
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        validate_default=True,
    )

    def finalize(self) -> "Settings":
        # Normaliza legacy JWT
        if self.jwt_secret and self.secret_key == "change-me":
            object.__setattr__(self, "secret_key", self.jwt_secret)
        if self.jwt_expire_minutes and self.access_token_expire_minutes == 120:
            object.__setattr__(self, "access_token_expire_minutes", self.jwt_expire_minutes)

        # Construye DATABASE_URL si no llegó
        if not self.database_url:
            u = self.postgres_user or "hostal"
            p = self.postgres_password or "hostal_pass"
            d = self.postgres_db or "hostal_db"
            h = self.postgres_host or "127.0.0.1"
            port = self.postgres_port or "5432"
            url = f"postgresql+psycopg://{u}:{p}@{h}:{port}/{d}"
            object.__setattr__(self, "database_url", url)

        # Debug flag por entorno
        if self.app_env == "prod":
            object.__setattr__(self, "debug", False)

        return self


# Instancia global
settings = Settings().finalize()
