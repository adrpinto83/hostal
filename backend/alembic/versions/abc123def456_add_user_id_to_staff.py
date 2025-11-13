"""Add user_id column to staff table for system user assignment."""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'abc123def456'
down_revision = ('e922274b8702', '264c79f6c947')
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('staff', sa.Column('user_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_staff_user_id'), 'staff', ['user_id'], unique=True)
    op.create_foreign_key('fk_staff_user_id', 'staff', 'users', ['user_id'], ['id'])

def downgrade():
    op.drop_constraint('fk_staff_user_id', 'staff', type_='foreignkey')
    op.drop_index(op.f('ix_staff_user_id'), table_name='staff')
    op.drop_column('staff', 'user_id')
