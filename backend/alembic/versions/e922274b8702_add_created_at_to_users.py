"""Add created_at column to users table."""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'e922274b8702'
down_revision = '71610d7ff4ce'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('users', sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()))

def downgrade():
    op.drop_column('users', 'created_at')
