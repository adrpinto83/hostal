"""Add staff_id and auto-suspension fields to devices table"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_staff_devices'
down_revision = '3383575e7741'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add staff_id column and auto-suspension fields to devices table"""

    # 1. Make guest_id nullable (allow devices without a guest)
    op.alter_column('devices', 'guest_id',
                    existing_type=sa.Integer(),
                    nullable=True)

    # 2. Add staff_id column for staff devices
    op.add_column('devices',
                  sa.Column('staff_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_devices_staff_id', 'devices', 'staff',
                          ['staff_id'], ['id'], ondelete='CASCADE')
    op.create_index(op.f('ix_devices_staff_id'), 'devices', ['staff_id'], unique=False)

    # 3. Add auto-suspension tracking fields
    op.add_column('devices',
                  sa.Column('auto_suspended', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('devices',
                  sa.Column('auto_suspension_reason', sa.Text(), nullable=True))
    op.add_column('devices',
                  sa.Column('auto_suspension_date', sa.DateTime(), nullable=True))

    # Create indexes for commonly queried fields
    op.create_index(op.f('ix_devices_auto_suspended'), 'devices', ['auto_suspended'], unique=False)


def downgrade() -> None:
    """Revert staff_id and auto-suspension fields from devices table"""

    # Drop indexes first
    op.drop_index(op.f('ix_devices_auto_suspended'), table_name='devices')
    op.drop_index(op.f('ix_devices_staff_id'), table_name='devices')

    # Drop foreign key
    op.drop_constraint('fk_devices_staff_id', 'devices', type_='foreignkey')

    # Remove columns
    op.drop_column('devices', 'auto_suspension_date')
    op.drop_column('devices', 'auto_suspension_reason')
    op.drop_column('devices', 'auto_suspended')
    op.drop_column('devices', 'staff_id')

    # Make guest_id non-nullable again
    op.alter_column('devices', 'guest_id',
                    existing_type=sa.Integer(),
                    nullable=False)
