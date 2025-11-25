# mypy: ignore-errors
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM as PGEnum

from alembic import op

revision = "0004_room_rates"
down_revision = "0003_add_reservations"
branch_labels = None
depends_on = None


def _get_period_type():
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        return PGEnum("day", "week", "fortnight", "month", name="period", create_type=False)
    return sa.String(20)


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = inspector.get_table_names()

    if "room_rates" not in table_names:
        op.create_table(
            "room_rates",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "room_id",
                sa.Integer(),
                sa.ForeignKey("rooms.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("period", _get_period_type(), nullable=False),
            sa.Column("price_bs", sa.Numeric(12, 2), nullable=False),
            sa.Column("currency_note", sa.String(length=50)),
            sa.UniqueConstraint("room_id", "period", name="uq_room_period"),
        )
        op.create_index(op.f("ix_room_rates_room_id"), "room_rates", ["room_id"])
    else:
        existing_indexes = {idx["name"] for idx in inspector.get_indexes("room_rates")}
        if "ix_room_rates_room_id" not in existing_indexes:
            op.create_index(op.f("ix_room_rates_room_id"), "room_rates", ["room_id"])


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "room_rates" in inspector.get_table_names():
        op.drop_index(op.f("ix_room_rates_room_id"), table_name="room_rates")
        op.drop_table("room_rates")
