"""Rename payment columns and add created_by"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "d4c6df2b986f"
down_revision = "b7b4b53a3c2d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("payments") as batch_op:
        batch_op.drop_constraint("payments_transaction_id_key", type_="unique")
        batch_op.alter_column("payment_method", new_column_name="method")
        batch_op.alter_column("transaction_id", new_column_name="reference_number")
        batch_op.alter_column(
            "reference_number",
            existing_type=sa.String(length=255),
            type_=sa.String(length=100),
            existing_nullable=True,
        )
        batch_op.create_unique_constraint("payments_reference_number_key", ["reference_number"])
        batch_op.add_column(sa.Column("created_by", sa.Integer(), nullable=True))

    op.create_foreign_key(
        "fk_payments_created_by_users",
        "payments",
        "users",
        ["created_by"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_payments_created_by_users", "payments", type_="foreignkey")

    with op.batch_alter_table("payments") as batch_op:
        batch_op.drop_column("created_by")
        batch_op.drop_constraint("payments_reference_number_key", type_="unique")
        batch_op.alter_column(
            "reference_number",
            existing_type=sa.String(length=100),
            type_=sa.String(length=255),
            existing_nullable=True,
        )
        batch_op.alter_column("reference_number", new_column_name="transaction_id")
        batch_op.alter_column("method", new_column_name="payment_method")
        batch_op.create_unique_constraint("payments_transaction_id_key", ["transaction_id"])
