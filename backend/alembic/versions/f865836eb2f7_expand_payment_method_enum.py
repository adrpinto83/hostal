"""Expand payment_method enum with new channels"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "f865836eb2f7"
down_revision = "d4c6df2b986f"
branch_labels = None
depends_on = None

NEW_VALUES = ("cash", "card", "transfer", "mobile_payment", "zelle", "paypal", "crypto", "other")
OLD_VALUES = ("cash", "card", "transfer", "mobile_payment", "other")


def upgrade() -> None:
    op.execute("ALTER TYPE payment_method RENAME TO payment_method_old")
    new_values = ", ".join(f"'{value}'" for value in NEW_VALUES)
    op.execute(f"CREATE TYPE payment_method AS ENUM ({new_values})")
    op.execute(
        """
        ALTER TABLE payments
        ALTER COLUMN method
        TYPE payment_method
        USING method::text::payment_method
        """
    )
    op.execute("DROP TYPE payment_method_old")


def downgrade() -> None:
    op.execute("ALTER TYPE payment_method RENAME TO payment_method_new")
    old_values = ", ".join(f"'{value}'" for value in OLD_VALUES)
    op.execute(f"CREATE TYPE payment_method AS ENUM ({old_values})")
    op.execute(
        """
        ALTER TABLE payments
        ALTER COLUMN method
        TYPE payment_method
        USING (
            CASE method::text
                WHEN 'zelle' THEN 'other'
                WHEN 'paypal' THEN 'other'
                WHEN 'crypto' THEN 'other'
                ELSE method::text
            END
        )::payment_method
        """
    )
    op.execute("DROP TYPE payment_method_new")
