import logging
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import settings

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


logger = logging.getLogger(__name__)


def ensure_minimum_schema():
    """Garantiza columnas críticas en entornos donde las migraciones no se han ejecutado."""
    try:
        inspector = inspect(engine)
        existing_tables = set(inspector.get_table_names())

        if "users" in existing_tables:
            existing_columns = {col["name"] for col in inspector.get_columns("users")}
            if "approved" not in existing_columns:
                with engine.begin() as conn:
                    conn.execute(
                        text("ALTER TABLE users ADD COLUMN approved BOOLEAN NOT NULL DEFAULT FALSE")
                    )
                    conn.execute(text("UPDATE users SET approved = TRUE WHERE role = 'admin'"))
                logger.info("Column 'approved' added to users table on-the-fly")

        if "media" in existing_tables:
            media_columns = {col["name"] for col in inspector.get_columns("media")}
            if "is_primary" not in media_columns:
                with engine.begin() as conn:
                    conn.execute(
                        text(
                            "ALTER TABLE media ADD COLUMN is_primary BOOLEAN NOT NULL DEFAULT FALSE"
                        )
                    )
                    conn.execute(text("UPDATE media SET is_primary = FALSE WHERE is_primary IS NULL"))
                    if engine.dialect.name != "sqlite":
                        conn.execute(
                            text("ALTER TABLE media ALTER COLUMN is_primary DROP DEFAULT")
                        )
                logger.info("Column 'is_primary' added to media table on-the-fly")
    except Exception as exc:
        logger.warning("Could not ensure minimum schema: %s", exc)
