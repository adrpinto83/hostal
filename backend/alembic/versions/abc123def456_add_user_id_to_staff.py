"""Add user_id column to staff table for system user assignment."""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'abc123def456'
down_revision = ('e922274b8702', '264c79f6c947')
branch_labels = None
depends_on = None

def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("staff")}

    if "user_id" not in columns:
        with op.batch_alter_table('staff') as batch_op:
            batch_op.add_column(sa.Column('user_id', sa.Integer(), nullable=True))
            batch_op.create_foreign_key('fk_staff_user_id', 'users', ['user_id'], ['id'], ondelete='SET NULL')
    else:
        # Ensure the foreign key exists even if the column was precreated
        fk_names = {fk['name'] for fk in inspector.get_foreign_keys('staff')}
        if 'fk_staff_user_id' not in fk_names:
            with op.batch_alter_table('staff') as batch_op:
                batch_op.create_foreign_key('fk_staff_user_id', 'users', ['user_id'], ['id'], ondelete='SET NULL')

    indexes = {idx["name"] for idx in inspector.get_indexes("staff")}
    if 'ix_staff_user_id' not in indexes:
        op.create_index(op.f('ix_staff_user_id'), 'staff', ['user_id'], unique=True)


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    indexes = {idx["name"] for idx in inspector.get_indexes("staff")}
    if 'ix_staff_user_id' in indexes:
        op.drop_index(op.f('ix_staff_user_id'), table_name='staff')

    fk_names = {fk['name'] for fk in inspector.get_foreign_keys('staff')}
    if 'fk_staff_user_id' in fk_names:
        with op.batch_alter_table('staff') as batch_op:
            batch_op.drop_constraint('fk_staff_user_id', type_='foreignkey')

    columns = {col["name"] for col in inspector.get_columns("staff")}
    if "user_id" in columns:
        with op.batch_alter_table('staff') as batch_op:
            batch_op.drop_column('user_id')
