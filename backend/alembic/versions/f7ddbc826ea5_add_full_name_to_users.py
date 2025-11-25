"""Add full_name to users table"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'f7ddbc826ea5'
down_revision = '0009_add_file_hash_to_media'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("users")}
    if "full_name" not in columns:
        with op.batch_alter_table("users") as batch_op:
            batch_op.add_column(sa.Column('full_name', sa.String(length=255), nullable=True))


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("users")}
    if "full_name" in columns:
        with op.batch_alter_table("users") as batch_op:
            batch_op.drop_column('full_name')
