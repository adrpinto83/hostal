from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "5e2a10be4dcb"       # <- coincide con el nombre del archivo
down_revision = "0001_init"     # <- pon aquí el revision de tu 0001 si es distinto
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        "devices",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("guest_id", sa.Integer(), sa.ForeignKey("guests.id", ondelete="CASCADE"), nullable=False),
        sa.Column("mac", sa.String(length=17), nullable=False),
        sa.Column("name", sa.String(length=100)),
        sa.Column("vendor", sa.String(length=100)),
        sa.Column("allowed", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.create_index(op.f("ix_devices_mac"), "devices", ["mac"], unique=False)
    op.create_index(op.f("ix_devices_guest_id"), "devices", ["guest_id"], unique=False)

def downgrade():
    op.drop_index(op.f("ix_devices_guest_id"), table_name="devices")
    op.drop_index(op.f("ix_devices_mac"), table_name="devices")
    op.drop_table("devices")
