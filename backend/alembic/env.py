# alembic/env.py
from __future__ import annotations

import sys
from logging.config import fileConfig
from pathlib import Path
from typing import Any

from sqlalchemy import engine_from_config, pool

from alembic import context as _alembic_context  # type: ignore[attr-defined]

# --- Habilitar import de "app" ---
BASE_DIR = Path(__file__).resolve().parents[1]  # .../backend
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# --- Config de Alembic ---
context: Any = _alembic_context  # mypy: alembic no tiene stubs

config = context.config

# Logging de Alembic (opcional, si existe alembic.ini)
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# --- Fuente única de settings (la misma que usa la app) ---
from app.core.config import settings  # noqa: E402
from app.core.db import Base  # noqa: E402
from app.models.device import Device  # noqa: F401,E402
from app.models.guest import Guest  # noqa: F401,E402
from app.models.reservation import Reservation  # noqa: F401,E402
from app.models.room import Room  # noqa: F401,E402
from app.models.room_rate import RoomRate  # noqa: F401,E402
from app.models.user import User  # noqa: F401,E402

db_url = settings.database_url
if not db_url:
    raise RuntimeError(
        "DATABASE_URL no está definido. Revisa app/core/config.py o tus variables de entorno."
    )

# Forzamos sqlalchemy.url para que Alembic use la misma URL
config.set_main_option("sqlalchemy.url", db_url)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Ejecuta migraciones en modo offline."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Ejecuta migraciones en modo online."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section) or {},
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
