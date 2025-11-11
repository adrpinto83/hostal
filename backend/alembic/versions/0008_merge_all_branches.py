# mypy: ignore-errors
"""merge all branches into single head"""

# This is a merge migration to consolidate all branches

# revision identifiers, used by Alembic.
revision = "0008_merge_all_branches"
down_revision = ("0007_complete_hostal_system", "41ac75d4a820")
branch_labels = None
depends_on = None


def upgrade():
    """No schema changes, just merging branches"""
    pass


def downgrade():
    """No schema changes, just merging branches"""
    pass
