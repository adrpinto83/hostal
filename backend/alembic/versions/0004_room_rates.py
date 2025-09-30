# mypy: ignore-errors
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM as PGEnum  # <-- añade esto

from alembic import op

revision = "0004_room_rates"
down_revision = "0003_add_reservations"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "room_rates",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "room_id",
            sa.Integer(),
            sa.ForeignKey("rooms.id", ondelete="CASCADE"),
            nullable=False,
        ),
        # Referenciar ENUM existente 'period' sin intentar crearlo
        sa.Column(
            "period",
            PGEnum("day", "week", "fortnight", "month", name="period", create_type=False),
            nullable=False,
        ),
        sa.Column("price_bs", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency_note", sa.String(length=50)),
    )
    op.create_index(op.f("ix_room_rates_room_id"), "room_rates", ["room_id"])
    op.create_unique_constraint("uq_room_period", "room_rates", ["room_id", "period"])


def downgrade():
    op.drop_constraint("uq_room_period", "room_rates", type_="unique")
    op.drop_index(op.f("ix_room_rates_room_id"), table_name="room_rates")
    op.drop_table("room_rates")
