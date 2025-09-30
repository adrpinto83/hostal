# mypy: ignore-errors
import sqlalchemy as sa

from alembic import op  # type: ignore[attr-defined]

# revision identifiers, used by Alembic.
revision = "0001_init"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=50), nullable=False, server_default="user"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "guests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("document_id", sa.String(length=100), nullable=False),
        sa.Column("phone", sa.String(length=50)),
        sa.Column("email", sa.String(length=255)),
        sa.Column("notes", sa.String(length=500)),
    )
    op.create_index("ix_guests_full_name", "guests", ["full_name"])
    op.create_index("ix_guests_document_id", "guests", ["document_id"])

    op.create_table(
        "rooms",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("number", sa.String(length=20), nullable=False, unique=True),
        sa.Column("base_price_bs", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="available"),
    )
    op.create_index("ix_rooms_number", "rooms", ["number"], unique=True)


def downgrade():
    op.drop_table("rooms")
    op.drop_table("guests")
    op.drop_table("users")
