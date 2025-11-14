"""Align network_activities schema with current model expectations."""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "b7b4b53a3c2d"
down_revision = "6cf0b0c8ad31"
branch_labels = None
depends_on = None


NEW_ACTIVITY_TYPE = ("connected", "disconnected", "quota_exceeded", "blocked", "unblocked")
OLD_ACTIVITY_TYPE = ("connection", "disconnection", "quota_exceeded", "suspended", "resumed")


def upgrade() -> None:
    op.add_column("network_activities", sa.Column("guest_id", sa.Integer(), nullable=True))
    op.add_column("network_activities", sa.Column("session_duration_seconds", sa.Integer(), nullable=True))
    op.add_column(
        "network_activities",
        sa.Column("initiated_by_system", sa.Boolean(), server_default=sa.text("true"), nullable=False),
    )
    op.alter_column("network_activities", "details", new_column_name="notes")

    new_values = ", ".join(f"'{value}'" for value in NEW_ACTIVITY_TYPE)
    op.execute("ALTER TYPE activity_type RENAME TO activity_type_old")
    op.execute(f"CREATE TYPE activity_type AS ENUM ({new_values})")
    op.execute(
        """
        ALTER TABLE network_activities
        ALTER COLUMN activity_type
        TYPE activity_type
        USING (
            CASE activity_type::text
                WHEN 'connection' THEN 'connected'
                WHEN 'disconnection' THEN 'disconnected'
                WHEN 'suspended' THEN 'blocked'
                WHEN 'resumed' THEN 'unblocked'
                ELSE activity_type::text
            END
        )::activity_type
        """
    )
    op.execute("DROP TYPE activity_type_old")

    op.execute(
        """
        UPDATE network_activities AS na
        SET guest_id = d.guest_id
        FROM devices AS d
        WHERE na.device_id = d.id AND na.guest_id IS NULL
        """
    )

    op.create_foreign_key(
        "fk_network_activities_guest_id_guests",
        "network_activities",
        "guests",
        ["guest_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("ix_network_activities_guest_id", "network_activities", ["guest_id"])
    op.alter_column("network_activities", "guest_id", nullable=False)
    op.alter_column("network_activities", "initiated_by_system", server_default=None)


def downgrade() -> None:
    op.alter_column("network_activities", "initiated_by_system", server_default=sa.text("true"))

    op.drop_index("ix_network_activities_guest_id", table_name="network_activities")
    op.drop_constraint(
        "fk_network_activities_guest_id_guests", "network_activities", type_="foreignkey"
    )
    op.drop_column("network_activities", "guest_id")
    op.drop_column("network_activities", "session_duration_seconds")
    op.drop_column("network_activities", "initiated_by_system")

    op.alter_column("network_activities", "notes", new_column_name="details")

    old_values = ", ".join(f"'{value}'" for value in OLD_ACTIVITY_TYPE)
    op.execute("ALTER TYPE activity_type RENAME TO activity_type_new")
    op.execute(f"CREATE TYPE activity_type AS ENUM ({old_values})")
    op.execute(
        """
        ALTER TABLE network_activities
        ALTER COLUMN activity_type
        TYPE activity_type
        USING (
            CASE activity_type::text
                WHEN 'connected' THEN 'connection'
                WHEN 'disconnected' THEN 'disconnection'
                WHEN 'blocked' THEN 'suspended'
                WHEN 'unblocked' THEN 'resumed'
                ELSE activity_type::text
            END
        )::activity_type
        """
    )
    op.execute("DROP TYPE activity_type_new")
