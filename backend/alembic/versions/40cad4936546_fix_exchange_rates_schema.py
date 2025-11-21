"""Fix exchange_rates table schema - rename effective_date to date and add missing columns.

Revision ID: 40cad4936546
Revises: def789ghi012
Create Date: 2025-11-13 02:05:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '40cad4936546'
down_revision = 'def789ghi012'
branch_labels = None
depends_on = None


def upgrade():
    # Rename effective_date column to date
    op.alter_column('exchange_rates', 'effective_date', new_column_name='date')

    # Add missing columns
    op.add_column('exchange_rates', sa.Column('valid_until', sa.DateTime(), nullable=True))
    op.add_column('exchange_rates', sa.Column('is_manual', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('exchange_rates', sa.Column('updated_at', sa.DateTime(), nullable=True))

    # Drop the old indexes that reference 'effective_date'
    op.drop_index('ix_exchange_rates_effective_date', table_name='exchange_rates')
    op.drop_index('ix_exchange_rates_pair', table_name='exchange_rates')

    # Create new index with 'date' column
    op.create_index('ix_exchange_rates_date', 'exchange_rates', ['date'], unique=False)
    op.create_index('ix_exchange_rates_pair', 'exchange_rates', ['from_currency', 'to_currency', 'date'], unique=False)


def downgrade():
    # Drop new indexes
    op.drop_index('ix_exchange_rates_pair', table_name='exchange_rates')
    op.drop_index('ix_exchange_rates_date', table_name='exchange_rates')

    # Recreate old indexes
    op.create_index('ix_exchange_rates_effective_date', 'exchange_rates', ['effective_date'], unique=False)
    op.create_index('ix_exchange_rates_pair', 'exchange_rates', ['from_currency', 'to_currency', 'effective_date'], unique=False)

    # Drop added columns
    op.drop_column('exchange_rates', 'updated_at')
    op.drop_column('exchange_rates', 'is_manual')
    op.drop_column('exchange_rates', 'valid_until')

    # Rename date back to effective_date
    op.alter_column('exchange_rates', 'date', new_column_name='effective_date')
