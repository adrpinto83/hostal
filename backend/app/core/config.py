# app/core/config.py
from __future__ import annotations

from typing import Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_ENV: str = Field(default="dev", alias="APP_ENV")
    DEBUG: bool = Field(default=False, alias="DEBUG")  # Más seguro por defecto
    SECRET_KEY: str = Field(default="change-me-in-production", alias="SECRET_KEY")
    ALGORITHM: str = Field(default="HS256", alias="ALGORITHM")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=120, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = Field(default=60, alias="PASSWORD_RESET_TOKEN_EXPIRE_MINUTES")

    # --- Server Settings ---
    API_URL: str = Field(
        default="http://localhost:8000",
        alias="API_URL",
        description="Base URL of the API server for generating absolute URLs",
    )
    FRONTEND_URL: str = Field(
        default="http://localhost:3000",
        alias="FRONTEND_URL",
        description="Base URL of the frontend used to build links in emails",
    )

    # --- CORS Settings ---
    CORS_ORIGINS: str = Field(
        default="http://localhost:3000,http://localhost:5173",
        alias="CORS_ORIGINS",
        description="Comma-separated list of allowed origins",
    )

    # --- Google OAuth Settings ---
    GOOGLE_CLIENT_ID: Optional[str] = Field(
        default=None,
        alias="GOOGLE_CLIENT_ID",
        description="Google OAuth Client ID"
    )
    GOOGLE_CLIENT_SECRET: Optional[str] = Field(
        default=None,
        alias="GOOGLE_CLIENT_SECRET",
        description="Google OAuth Client Secret"
    )

    # --- DB Settings ---
    DATABASE_URL: Optional[str] = Field(default=None)
    POSTGRES_USER: Optional[str] = None
    POSTGRES_PASSWORD: Optional[str] = None
    POSTGRES_DB: Optional[str] = None
    POSTGRES_HOST: Optional[str] = None
    POSTGRES_PORT: Optional[int] = None

    # --- SMTP / Email Settings ---
    SMTP_HOST: Optional[str] = Field(default=None, alias="SMTP_HOST")
    SMTP_PORT: Optional[int] = Field(default=587, alias="SMTP_PORT")
    SMTP_USERNAME: Optional[str] = Field(default=None, alias="SMTP_USERNAME")
    SMTP_PASSWORD: Optional[str] = Field(default=None, alias="SMTP_PASSWORD")
    SMTP_TLS: bool = Field(default=True, alias="SMTP_TLS")
    EMAIL_FROM: Optional[str] = Field(default="no-reply@hostal.local", alias="EMAIL_FROM")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        validate_default=True,
    )

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str, info) -> str:
        """Valida que SECRET_KEY sea seguro en producción."""
        app_env = info.data.get("APP_ENV", "dev")
        if app_env == "prod" and v in ("change-me", "change-me-in-production", ""):
            raise ValueError(
                "SECRET_KEY must be set to a secure random value in production. "
                "Generate one with: python -c 'import secrets; print(secrets.token_urlsafe(32))'"
            )
        if len(v) < 32 and app_env == "prod":
            raise ValueError("SECRET_KEY must be at least 32 characters long in production")
        return v

    def get_cors_origins(self) -> list[str]:
        """Retorna lista de origins permitidos para CORS."""
        if self.CORS_ORIGINS == "*":
            return ["*"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    def finalize(self) -> "Settings":
        """Finaliza configuración con valores calculados."""
        # Construir DATABASE_URL si no está configurado
        if not self.DATABASE_URL:
            u = self.POSTGRES_USER or "hostal"
            p = self.POSTGRES_PASSWORD or "hostal_pass"
            d = self.POSTGRES_DB or "hostal_db"
            h = self.POSTGRES_HOST or "127.0.0.1"
            port = self.POSTGRES_PORT or 5432
            url = f"postgresql+psycopg://{u}:{p}@{h}:{port}/{d}"
            object.__setattr__(self, "DATABASE_URL", url)

        # Ajustar DEBUG según entorno
        if self.APP_ENV == "prod":
            object.__setattr__(self, "DEBUG", False)
        elif self.APP_ENV == "dev":
            object.__setattr__(self, "DEBUG", True)

        return self


# Instancia global
settings = Settings().finalize()
