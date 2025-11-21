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
    """Add file_hash column to media table"""
    # Check if column exists before adding (idempotent)
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='media' AND column_name='file_hash'
            ) THEN
                ALTER TABLE media ADD COLUMN file_hash VARCHAR(64);
                CREATE INDEX IF NOT EXISTS ix_media_file_hash ON media(file_hash);
            END IF;
        END $$;
    """)


def downgrade():
    """Remove file_hash column from media table"""
    op.execute("DROP INDEX IF EXISTS ix_media_file_hash")
    op.execute("ALTER TABLE media DROP COLUMN IF EXISTS file_hash")
