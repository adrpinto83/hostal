# mypy: ignore-errors
"""merge rooms branch with main branch"""

# This is a merge migration.
# It has no schema changes, only merges two branches.

# revision identifiers, used by Alembic.
revision = "41ac75d4a820"
down_revision = ("0006_add_rooms_notes", "0002_create_rooms")
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
