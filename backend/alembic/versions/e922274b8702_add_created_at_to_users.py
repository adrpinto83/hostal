"""Add created_at column to users table."""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'e922274b8702'
down_revision = '71610d7ff4ce'
branch_labels = None
depends_on = None

def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("users")}
    if "created_at" not in columns:
        with op.batch_alter_table('users') as batch_op:
            batch_op.add_column(sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()))

def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("users")}
    if "created_at" in columns:
        with op.batch_alter_table('users') as batch_op:
            batch_op.drop_column('created_at')
