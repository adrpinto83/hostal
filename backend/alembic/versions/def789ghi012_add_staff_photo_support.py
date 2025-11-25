"""Add staff_photo support with staff_id column to media table.

Revision ID: def789ghi012
Revises: abc123def456
Create Date: 2025-11-13 01:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'def789ghi012'
down_revision = 'abc123def456'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("ALTER TYPE media_category ADD VALUE IF NOT EXISTS 'staff_photo' BEFORE 'other'")

    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("media")}
    if "staff_id" not in columns:
        with op.batch_alter_table('media') as batch_op:
            batch_op.add_column(sa.Column('staff_id', sa.Integer(), nullable=True))
            batch_op.create_foreign_key('fk_media_staff_id', 'staff', ['staff_id'], ['id'], ondelete='CASCADE')
    else:
        fk_names = {fk['name'] for fk in inspector.get_foreign_keys('media')}
        if 'fk_media_staff_id' not in fk_names:
            with op.batch_alter_table('media') as batch_op:
                batch_op.create_foreign_key('fk_media_staff_id', 'staff', ['staff_id'], ['id'], ondelete='CASCADE')

    indexes = {idx["name"] for idx in inspector.get_indexes("media")}
    if 'ix_media_staff_id' not in indexes:
        op.create_index('ix_media_staff_id', 'media', ['staff_id'], unique=False)


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    indexes = {idx["name"] for idx in inspector.get_indexes("media")}
    if 'ix_media_staff_id' in indexes:
        op.drop_index('ix_media_staff_id', table_name='media')

    fk_names = {fk['name'] for fk in inspector.get_foreign_keys('media')}
    if 'fk_media_staff_id' in fk_names:
        with op.batch_alter_table('media') as batch_op:
            batch_op.drop_constraint('fk_media_staff_id', type_='foreignkey')

    columns = {col["name"] for col in inspector.get_columns("media")}
    if "staff_id" in columns:
        with op.batch_alter_table('media') as batch_op:
            batch_op.drop_column('staff_id')
