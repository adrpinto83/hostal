# mypy: ignore-errors
"""Complete hostal management system with internet control, payments, and media"""

import sqlalchemy as sa
from sqlalchemy import inspect

from alembic import op

# revision identifiers, used by Alembic.
revision = "0007_complete_hostal_system"
down_revision = "5e2a10be4dcb"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    insp = inspect(bind)

    # 1. Enhance devices table with internet control fields
    devices_cols = {c["name"] for c in insp.get_columns("devices")}
    if "suspended" not in devices_cols:
        op.add_column("devices", sa.Column("suspended", sa.Boolean(), nullable=False, server_default=sa.false()))
    if "suspension_reason" not in devices_cols:
        op.add_column("devices", sa.Column("suspension_reason", sa.Text(), nullable=True))
    if "daily_quota_mb" not in devices_cols:
        op.add_column("devices", sa.Column("daily_quota_mb", sa.BigInteger(), nullable=True))
    if "monthly_quota_mb" not in devices_cols:
        op.add_column("devices", sa.Column("monthly_quota_mb", sa.BigInteger(), nullable=True))
    if "first_seen" not in devices_cols:
        op.add_column("devices", sa.Column("first_seen", sa.DateTime(), nullable=True))
    if "last_seen" not in devices_cols:
        op.add_column("devices", sa.Column("last_seen", sa.DateTime(), nullable=True))
    if "last_ip" not in devices_cols:
        op.add_column("devices", sa.Column("last_ip", sa.String(length=45), nullable=True))
    if "total_bytes_downloaded" not in devices_cols:
        op.add_column("devices", sa.Column("total_bytes_downloaded", sa.BigInteger(), nullable=False, server_default="0"))
    if "total_bytes_uploaded" not in devices_cols:
        op.add_column("devices", sa.Column("total_bytes_uploaded", sa.BigInteger(), nullable=False, server_default="0"))

    # Add indexes for devices
    try:
        op.create_index("ix_devices_suspended", "devices", ["suspended"])
        op.create_index("ix_devices_allowed", "devices", ["allowed"])
    except Exception:
        pass  # Indexes may already exist

    # 2. Create staff table
    if "staff" not in insp.get_table_names():
        op.create_table(
            "staff",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("full_name", sa.String(length=255), nullable=False),
            sa.Column("document_id", sa.String(length=100), nullable=False, unique=True),
            sa.Column("phone", sa.String(length=50), nullable=True),
            sa.Column("email", sa.String(length=255), nullable=True),
            sa.Column("role", sa.Enum("recepcionista", "limpieza", "mantenimiento", "gerente", "seguridad",
                                      name="staff_role", create_type=True), nullable=False),
            sa.Column("status", sa.Enum("active", "inactive", "on_leave", "terminated",
                                        name="staff_status", create_type=True), nullable=False, server_default="active"),
            sa.Column("hire_date", sa.Date(), nullable=True),
            sa.Column("salary", sa.Float(), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
        )
        op.create_index("ix_staff_full_name", "staff", ["full_name"])
        op.create_index("ix_staff_document_id", "staff", ["document_id"], unique=True)
        op.create_index("ix_staff_role", "staff", ["role"])
        op.create_index("ix_staff_status", "staff", ["status"])

    # 3. Create occupancies table
    if "occupancies" not in insp.get_table_names():
        op.create_table(
            "occupancies",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("room_id", sa.Integer(), sa.ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False),
            sa.Column("guest_id", sa.Integer(), sa.ForeignKey("guests.id", ondelete="CASCADE"), nullable=False),
            sa.Column("reservation_id", sa.Integer(), sa.ForeignKey("reservations.id", ondelete="SET NULL"), nullable=True),
            sa.Column("check_in", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column("check_out", sa.DateTime(), nullable=True),
            sa.Column("amount_paid_bs", sa.Float(), nullable=True),
            sa.Column("amount_paid_usd", sa.Float(), nullable=True),
            sa.Column("payment_method", sa.String(length=50), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
        )
        op.create_index("ix_occupancies_room_id", "occupancies", ["room_id"])
        op.create_index("ix_occupancies_guest_id", "occupancies", ["guest_id"])
        op.create_index("ix_occupancies_check_in", "occupancies", ["check_in"])
        op.create_index("ix_occupancies_check_out", "occupancies", ["check_out"])

    # 4. Create maintenances table
    if "maintenances" not in insp.get_table_names():
        op.create_table(
            "maintenances",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("room_id", sa.Integer(), sa.ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False),
            sa.Column("assigned_to", sa.Integer(), sa.ForeignKey("staff.id", ondelete="SET NULL"), nullable=True),
            sa.Column("type", sa.Enum("plomeria", "electricidad", "pintura", "limpieza_profunda",
                                      "reparacion_muebles", "aire_acondicionado", "cerrajeria",
                                      "electrodomesticos", "otro", name="maintenance_type", create_type=True), nullable=False),
            sa.Column("priority", sa.Enum("low", "medium", "high", "critical",
                                         name="maintenance_priority", create_type=True), nullable=False),
            sa.Column("status", sa.Enum("pending", "in_progress", "completed", "cancelled",
                                       name="maintenance_status", create_type=True), nullable=False, server_default="pending"),
            sa.Column("title", sa.String(length=200), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("reported_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column("started_at", sa.DateTime(), nullable=True),
            sa.Column("completed_at", sa.DateTime(), nullable=True),
            sa.Column("estimated_cost", sa.Float(), nullable=True),
            sa.Column("actual_cost", sa.Float(), nullable=True),
        )
        op.create_index("ix_maintenances_room_id", "maintenances", ["room_id"])
        op.create_index("ix_maintenances_status", "maintenances", ["status"])
        op.create_index("ix_maintenances_priority", "maintenances", ["priority"])

    # 5. Create network_activities table
    if "network_activities" not in insp.get_table_names():
        op.create_table(
            "network_activities",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("device_id", sa.Integer(), sa.ForeignKey("devices.id", ondelete="CASCADE"), nullable=False),
            sa.Column("activity_type", sa.Enum("connection", "disconnection", "quota_exceeded",
                                               "suspended", "resumed", name="activity_type", create_type=True), nullable=False),
            sa.Column("timestamp", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column("ip_address", sa.String(length=45), nullable=True),
            sa.Column("bytes_downloaded", sa.BigInteger(), nullable=True, server_default="0"),
            sa.Column("bytes_uploaded", sa.BigInteger(), nullable=True, server_default="0"),
            sa.Column("details", sa.Text(), nullable=True),
        )
        op.create_index("ix_network_activities_device_id", "network_activities", ["device_id"])
        op.create_index("ix_network_activities_timestamp", "network_activities", ["timestamp"])
        op.create_index("ix_network_activities_activity_type", "network_activities", ["activity_type"])

    # 6. Create payments table
    if "payments" not in insp.get_table_names():
        op.create_table(
            "payments",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("guest_id", sa.Integer(), sa.ForeignKey("guests.id", ondelete="CASCADE"), nullable=False),
            sa.Column("reservation_id", sa.Integer(), sa.ForeignKey("reservations.id", ondelete="SET NULL"), nullable=True),
            sa.Column("occupancy_id", sa.Integer(), sa.ForeignKey("occupancies.id", ondelete="SET NULL"), nullable=True),
            sa.Column("amount", sa.Float(), nullable=False),
            sa.Column("currency", sa.Enum("EUR", "USD", "VES", name="currency", create_type=True), nullable=False),
            sa.Column("amount_eur", sa.Float(), nullable=True),
            sa.Column("amount_usd", sa.Float(), nullable=True),
            sa.Column("amount_ves", sa.Float(), nullable=True),
            sa.Column("exchange_rate_eur", sa.Float(), nullable=True),
            sa.Column("exchange_rate_usd", sa.Float(), nullable=True),
            sa.Column("exchange_rate_ves", sa.Float(), nullable=True),
            sa.Column("payment_method", sa.Enum("cash", "card", "transfer", "mobile_payment", "other",
                                                name="payment_method", create_type=True), nullable=False),
            sa.Column("status", sa.Enum("pending", "completed", "failed", "refunded",
                                       name="payment_status", create_type=True), nullable=False, server_default="pending"),
            sa.Column("transaction_id", sa.String(length=255), nullable=True, unique=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("payment_date", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_payments_guest_id", "payments", ["guest_id"])
        op.create_index("ix_payments_reservation_id", "payments", ["reservation_id"])
        op.create_index("ix_payments_status", "payments", ["status"])
        op.create_index("ix_payments_payment_date", "payments", ["payment_date"])
        op.create_index("ix_payments_currency", "payments", ["currency"])

    # 7. Create exchange_rates table
    if "exchange_rates" not in insp.get_table_names():
        op.create_table(
            "exchange_rates",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("from_currency", sa.String(length=3), nullable=False),
            sa.Column("to_currency", sa.String(length=3), nullable=False),
            sa.Column("rate", sa.Float(), nullable=False),
            sa.Column("source", sa.String(length=100), nullable=True),
            sa.Column("effective_date", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_exchange_rates_from_currency", "exchange_rates", ["from_currency"])
        op.create_index("ix_exchange_rates_to_currency", "exchange_rates", ["to_currency"])
        op.create_index("ix_exchange_rates_effective_date", "exchange_rates", ["effective_date"])
        # Composite index for currency pair lookups
        op.create_index("ix_exchange_rates_pair", "exchange_rates", ["from_currency", "to_currency", "effective_date"])

    # 8. Create media table
    if "media" not in insp.get_table_names():
        op.create_table(
            "media",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("filename", sa.String(length=255), nullable=False),
            sa.Column("stored_filename", sa.String(length=255), nullable=False, unique=True),
            sa.Column("file_path", sa.String(length=500), nullable=False),
            sa.Column("file_size", sa.Integer(), nullable=False),
            sa.Column("mime_type", sa.String(length=100), nullable=False),
            sa.Column("media_type", sa.Enum("image", "document", "video", "other",
                                           name="media_type", create_type=True), nullable=False),
            sa.Column("category", sa.Enum("room_photo", "guest_id", "guest_photo", "payment_proof",
                                         "maintenance_photo", "other", name="media_category", create_type=True), nullable=False),
            sa.Column("guest_id", sa.Integer(), sa.ForeignKey("guests.id", ondelete="CASCADE"), nullable=True),
            sa.Column("room_id", sa.Integer(), sa.ForeignKey("rooms.id", ondelete="CASCADE"), nullable=True),
            sa.Column("maintenance_id", sa.Integer(), sa.ForeignKey("maintenances.id", ondelete="CASCADE"), nullable=True),
            sa.Column("payment_id", sa.Integer(), sa.ForeignKey("payments.id", ondelete="CASCADE"), nullable=True),
            sa.Column("title", sa.String(length=200), nullable=True),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("alt_text", sa.String(length=200), nullable=True),
            sa.Column("uploaded_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("uploaded_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_media_guest_id", "media", ["guest_id"])
        op.create_index("ix_media_room_id", "media", ["room_id"])
        op.create_index("ix_media_media_type", "media", ["media_type"])
        op.create_index("ix_media_category", "media", ["category"])
        op.create_index("ix_media_uploaded_at", "media", ["uploaded_at"])

    # 9. Add currency_note to room_rates if table exists
    if "room_rates" in insp.get_table_names():
        room_rates_cols = {c["name"] for c in insp.get_columns("room_rates")}
        if "currency_note" not in room_rates_cols:
            op.add_column("room_rates", sa.Column("currency_note", sa.String(length=50), nullable=True))


def downgrade():
    bind = op.get_bind()
    insp = inspect(bind)

    # Drop media table
    if "media" in insp.get_table_names():
        op.drop_index("ix_media_uploaded_at", table_name="media")
        op.drop_index("ix_media_category", table_name="media")
        op.drop_index("ix_media_media_type", table_name="media")
        op.drop_index("ix_media_room_id", table_name="media")
        op.drop_index("ix_media_guest_id", table_name="media")
        op.drop_table("media")

    # Drop exchange_rates table
    if "exchange_rates" in insp.get_table_names():
        op.drop_index("ix_exchange_rates_pair", table_name="exchange_rates")
        op.drop_index("ix_exchange_rates_effective_date", table_name="exchange_rates")
        op.drop_index("ix_exchange_rates_to_currency", table_name="exchange_rates")
        op.drop_index("ix_exchange_rates_from_currency", table_name="exchange_rates")
        op.drop_table("exchange_rates")

    # Drop payments table
    if "payments" in insp.get_table_names():
        op.drop_index("ix_payments_currency", table_name="payments")
        op.drop_index("ix_payments_payment_date", table_name="payments")
        op.drop_index("ix_payments_status", table_name="payments")
        op.drop_index("ix_payments_reservation_id", table_name="payments")
        op.drop_index("ix_payments_guest_id", table_name="payments")
        op.drop_table("payments")

    # Drop network_activities table
    if "network_activities" in insp.get_table_names():
        op.drop_index("ix_network_activities_activity_type", table_name="network_activities")
        op.drop_index("ix_network_activities_timestamp", table_name="network_activities")
        op.drop_index("ix_network_activities_device_id", table_name="network_activities")
        op.drop_table("network_activities")

    # Drop maintenances table
    if "maintenances" in insp.get_table_names():
        op.drop_index("ix_maintenances_priority", table_name="maintenances")
        op.drop_index("ix_maintenances_status", table_name="maintenances")
        op.drop_index("ix_maintenances_room_id", table_name="maintenances")
        op.drop_table("maintenances")

    # Drop occupancies table
    if "occupancies" in insp.get_table_names():
        op.drop_index("ix_occupancies_check_out", table_name="occupancies")
        op.drop_index("ix_occupancies_check_in", table_name="occupancies")
        op.drop_index("ix_occupancies_guest_id", table_name="occupancies")
        op.drop_index("ix_occupancies_room_id", table_name="occupancies")
        op.drop_table("occupancies")

    # Drop staff table
    if "staff" in insp.get_table_names():
        op.drop_index("ix_staff_status", table_name="staff")
        op.drop_index("ix_staff_role", table_name="staff")
        op.drop_index("ix_staff_document_id", table_name="staff")
        op.drop_index("ix_staff_full_name", table_name="staff")
        op.drop_table("staff")

    # Remove currency_note from room_rates
    if "room_rates" in insp.get_table_names():
        room_rates_cols = {c["name"] for c in insp.get_columns("room_rates")}
        if "currency_note" in room_rates_cols:
            op.drop_column("room_rates", "currency_note")

    # Remove enhanced fields from devices
    devices_cols = {c["name"] for c in insp.get_columns("devices")}
    if "total_bytes_uploaded" in devices_cols:
        op.drop_column("devices", "total_bytes_uploaded")
    if "total_bytes_downloaded" in devices_cols:
        op.drop_column("devices", "total_bytes_downloaded")
    if "last_ip" in devices_cols:
        op.drop_column("devices", "last_ip")
    if "last_seen" in devices_cols:
        op.drop_column("devices", "last_seen")
    if "first_seen" in devices_cols:
        op.drop_column("devices", "first_seen")
    if "monthly_quota_mb" in devices_cols:
        op.drop_column("devices", "monthly_quota_mb")
    if "daily_quota_mb" in devices_cols:
        op.drop_column("devices", "daily_quota_mb")
    if "suspension_reason" in devices_cols:
        op.drop_column("devices", "suspension_reason")
    if "suspended" in devices_cols:
        op.drop_column("devices", "suspended")

    # Remove indexes
    try:
        op.drop_index("ix_devices_allowed", table_name="devices")
        op.drop_index("ix_devices_suspended", table_name="devices")
    except Exception:
        pass
