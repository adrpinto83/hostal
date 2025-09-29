from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM as PGEnum

revision = "0003_add_reservations"
down_revision = "5e2a10be4dcb"   # <-- pon aquí tu última revisión (devices)
branch_labels = None
depends_on = None

def upgrade():
    # 1) Crear tipos ENUM solo si NO existen
    op.execute("""
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'period') THEN
            CREATE TYPE period AS ENUM ('day','week','fortnight','month');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reservationstatus') THEN
            CREATE TYPE reservationstatus AS ENUM ('pending','active','checked_out','cancelled');
        END IF;
    END
    $$;
    """)

    # 2) Reutilizar los tipos existentes sin intentar crearlos otra vez
    period_enum = PGEnum('day','week','fortnight','month', name='period', create_type=False)
    status_enum = PGEnum('pending','active','checked_out','cancelled', name='reservationstatus', create_type=False)

    op.create_table(
        "reservations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("guest_id", sa.Integer(), sa.ForeignKey("guests.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("room_id", sa.Integer(), sa.ForeignKey("rooms.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("period", period_enum, nullable=False),
        sa.Column("periods_count", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("price_bs", sa.Numeric(12, 2), nullable=False),
        sa.Column("rate_usd", sa.Numeric(12, 6)),
        sa.Column("rate_eur", sa.Numeric(12, 6)),
        sa.Column("status", status_enum, nullable=False, server_default="pending"),
        sa.Column("notes", sa.String(length=500)),
    )
    op.create_index(op.f("ix_reservations_guest_id"), "reservations", ["guest_id"])
    op.create_index(op.f("ix_reservations_room_id"), "reservations", ["room_id"])
    op.create_index(op.f("ix_reservations_status"), "reservations", ["status"])

def downgrade():
    op.drop_index(op.f("ix_reservations_status"), table_name="reservations")
    op.drop_index(op.f("ix_reservations_room_id"), table_name="reservations")
    op.drop_index(op.f("ix_reservations_guest_id"), table_name="reservations")
    op.drop_table("reservations")
    # No eliminamos los tipos (pueden estar en uso por otras tablas)
