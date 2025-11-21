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
    # Add staff_photo to media_category enum in PostgreSQL
    op.execute("ALTER TYPE media_category ADD VALUE 'staff_photo' BEFORE 'other'")

    # Add staff_id column to media table
    op.add_column('media', sa.Column('staff_id', sa.Integer(), nullable=True))
    op.create_index('ix_media_staff_id', 'media', ['staff_id'], unique=False)
    op.create_foreign_key('fk_media_staff_id', 'media', 'staff', ['staff_id'], ['id'], ondelete='CASCADE')


def downgrade():
    # Remove foreign key and index
    op.drop_constraint('fk_media_staff_id', 'media', type_='foreignkey')
    op.drop_index('ix_media_staff_id', table_name='media')
    op.drop_column('media', 'staff_id')
