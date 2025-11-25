# mypy: ignore-errors
"""add file_hash to media table"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0009_add_file_hash_to_media"
down_revision = "0008_merge_all_branches"
branch_labels = None
depends_on = None


def upgrade():
    """Add file_hash column to media table compatible with SQLite/PostgreSQL."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("media")}

    if "file_hash" not in columns:
        with op.batch_alter_table("media") as batch_op:
            batch_op.add_column(sa.Column("file_hash", sa.String(length=64), nullable=True))

    indexes = {idx["name"] for idx in inspector.get_indexes("media")}
    if "ix_media_file_hash" not in indexes:
        op.create_index("ix_media_file_hash", "media", ["file_hash"])


def downgrade():
    """Remove file_hash column from media table"""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    indexes = {idx["name"] for idx in inspector.get_indexes("media")}
    if "ix_media_file_hash" in indexes:
        op.drop_index("ix_media_file_hash", table_name="media")

    columns = {col["name"] for col in inspector.get_columns("media")}
    if "file_hash" in columns:
        with op.batch_alter_table("media") as batch_op:
            batch_op.drop_column("file_hash")
