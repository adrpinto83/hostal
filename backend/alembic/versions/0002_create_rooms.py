# mypy: ignore-errors
"""create rooms table (safe if not exists)"""

from enum import Enum

import sqlalchemy as sa
from sqlalchemy import inspect

from alembic import op

# revision identifiers, used by Alembic.
revision = "0002_create_rooms"
down_revision = "0001_init"
branch_labels = None
depends_on = None


class RoomType(str, Enum):
    single = "single"
    double = "double"
    suite = "suite"


def upgrade():
    bind = op.get_bind()
    insp = inspect(bind)

    if not insp.has_table("rooms"):
        room_type = sa.Enum(*[e.value for e in RoomType], name="room_type")
        room_type.create(bind, checkfirst=True)

        op.create_table(
            "rooms",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("number", sa.String(length=20), nullable=False),
            sa.Column("type", room_type, nullable=False),
            sa.Column("notes", sa.Text(), nullable=True),
        )
        # índices
        op.create_index("ix_rooms_id", "rooms", ["id"], unique=False)
        op.create_index("ix_rooms_number", "rooms", ["number"], unique=False)
        op.create_unique_constraint("uq_rooms_number", "rooms", ["number"])
    else:
        # Si la tabla existe, aseguramos constraint único
        # (no falla si ya existe)
        try:
            op.create_unique_constraint("uq_rooms_number", "rooms", ["number"])
        except Exception:
            pass


def downgrade():
    bind = op.get_bind()
    insp = inspect(bind)

    if insp.has_table("rooms"):
        try:
            op.drop_constraint("uq_rooms_number", "rooms", type_="unique")
        except Exception:
            pass
        op.drop_index("ix_rooms_number", table_name="rooms")
        op.drop_index("ix_rooms_id", table_name="rooms")
        op.drop_table("rooms")

    # enum puede quedarse si otras tablas lo usan; si no, se podría eliminar:
    try:
        sa.Enum(name="room_type").drop(bind, checkfirst=True)
    except Exception:
        pass
