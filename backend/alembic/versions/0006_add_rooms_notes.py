# alembic/versions/0006_add_rooms_notes.py
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "0006_add_rooms_notes"
down_revision = "0005_fix_rooms_and_rates"  # ajusta si tu última migración tiene otro id
branch_labels = None
depends_on = None

def upgrade():
    bind = op.get_bind()
    insp = inspect(bind)
    cols = {c["name"] for c in insp.get_columns("rooms")}
    if "notes" not in cols:
        op.add_column("rooms", sa.Column("notes", sa.Text(), nullable=True))

def downgrade():
    bind = op.get_bind()
    insp = inspect(bind)
    cols = {c["name"] for c in insp.get_columns("rooms")}
    if "notes" in cols:
        op.drop_column("rooms", "notes")
