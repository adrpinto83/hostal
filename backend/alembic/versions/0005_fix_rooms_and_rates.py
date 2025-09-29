# alembic/versions/0005_fix_rooms_and_rates.py
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = "0005_fix_rooms_and_rates"
down_revision = "0004_room_rates"  # si tu última es 0004; si no, usa la que corresponda
branch_labels = None
depends_on = None

def upgrade():
    bind = op.get_bind()
    insp = Inspector.from_engine(bind)

    # 1) Columna rooms.type (String(20), nullable=True)
    rooms_cols = {c["name"] for c in insp.get_columns("rooms")}
    if "type" not in rooms_cols:
        op.add_column("rooms", sa.Column("type", sa.String(length=20), nullable=True))

    # 2) Tabla room_rates (si no existe)
    existing_tables = insp.get_table_names()
    if "room_rates" not in existing_tables:
        # Usar el tipo ENUM ya existente en Postgres (creado por migración anterior)
        period_enum = sa.Enum("day", "week", "fortnight", "month", name="period", create_type=False)

        op.create_table(
            "room_rates",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("room_id", sa.Integer(), sa.ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False),
            sa.Column("period", period_enum, nullable=False),
            sa.Column("price_bs", sa.Numeric(12, 2), nullable=False),
            sa.Column("currency_note", sa.String(length=50)),
        )
        op.create_index(op.f("ix_room_rates_room_id"), "room_rates", ["room_id"])
        op.create_unique_constraint("uq_room_period", "room_rates", ["room_id", "period"])

def downgrade():
    bind = op.get_bind()
    insp = sa.inspect(bind)

    # Borrar tabla room_rates si existe
    if "room_rates" in insp.get_table_names():
        op.drop_constraint("uq_room_period", "room_rates", type_="unique")
        op.drop_index(op.f("ix_room_rates_room_id"), table_name="room_rates")
        op.drop_table("room_rates")

    # Quitar columna rooms.type si existe
    rooms_cols = {c["name"] for c in insp.get_columns("rooms")}
    if "type" in rooms_cols:
        op.drop_column("rooms", "type")
