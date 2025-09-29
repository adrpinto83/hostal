from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
import os
from dotenv import load_dotenv
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
import os, sys
from pathlib import Path
from dotenv import load_dotenv

# Añade la carpeta 'backend' al sys.path para poder importar 'app'
BASE_DIR = Path(__file__).resolve().parents[1]  # .../backend
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# Carga .env y fuerza sqlalchemy.url
load_dotenv()
config = context.config
db_url = os.getenv("DATABASE_URL", "")
if not db_url:
    raise RuntimeError("DATABASE_URL no está definido en .env")
config.set_main_option("sqlalchemy.url", db_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

from app.core.db import Base  # noqa
from app.models.user import User  # noqa
from app.models.guest import Guest  # noqa
from app.models.room import Room  # noqa

target_metadata = Base.metadata
# ... (resto del archivo igual)


# Carga variables de entorno (DATABASE_URL) desde .env
load_dotenv()

config = context.config

# Fuerza sqlalchemy.url desde ENV/.env y falla claro si no existe
db_url = os.getenv("DATABASE_URL", "")
if not db_url:
    raise RuntimeError(
        "DATABASE_URL no está definido. Crea .env (o exporta la variable) antes de correr Alembic."
    )
config.set_main_option("sqlalchemy.url", db_url)

# Logging de Alembic
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Importa metadata
from app.core.db import Base  # noqa
from app.models.user import User  # noqa
from app.models.guest import Guest  # noqa
from app.models.room import Room  # noqa

target_metadata = Base.metadata

def run_migrations_offline():
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

def run_migrations_online():
    """Ejecuta migraciones en modo online."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
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
