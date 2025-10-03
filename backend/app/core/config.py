# app/core/config.py
from __future__ import annotations

from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_ENV: str = Field(default="dev", alias="APP_ENV")
    DEBUG: bool = Field(default=True, alias="DEBUG")
    SECRET_KEY: str = Field(default="change-me", alias="SECRET_KEY")  # Cambiado y alias corregido
    ALGORITHM: str = Field(default="HS256", alias="ALGORITHM")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=120, alias="ACCESS_TOKEN_EXPIRE_MINUTES")

    # --- DB Settings ---
    DATABASE_URL: Optional[str] = Field(default=None)
    POSTGRES_USER: Optional[str] = None
    POSTGRES_PASSWORD: Optional[str] = None
    POSTGRES_DB: Optional[str] = None
    POSTGRES_HOST: Optional[str] = None
    POSTGRES_PORT: Optional[int] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        validate_default=True,
    )

    def finalize(self) -> "Settings":
        if not self.DATABASE_URL:
            u = self.POSTGRES_USER or "hostal"
            p = self.POSTGRES_PASSWORD or "hostal_pass"
            d = self.POSTGRES_DB or "hostal_db"
            h = self.POSTGRES_HOST or "127.0.0.1"
            port = self.POSTGRES_PORT or 5432
            url = f"postgresql+psycopg://{u}:{p}@{h}:{port}/{d}"
            object.__setattr__(self, "DATABASE_URL", url)

        if self.APP_ENV == "prod":
            object.__setattr__(self, "DEBUG", False)

        return self


# Instancia global
settings = Settings().finalize()
