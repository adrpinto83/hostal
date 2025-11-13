"""Add full_name to users table"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'f7ddbc826ea5'
down_revision = '0009_add_file_hash_to_media'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('full_name', sa.String(length=255), nullable=True))


def downgrade():
    op.drop_column('users', 'full_name')
