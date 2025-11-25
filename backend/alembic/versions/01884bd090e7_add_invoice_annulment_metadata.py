"""Add SENIAT-compliant annulment metadata to invoices.

Revision ID: 01884bd090e7
Revises: bb979b8d466e
Create Date: 2025-11-24
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '01884bd090e7'
down_revision = 'bb979b8d466e'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('invoices', sa.Column('cancellation_reason', sa.Text(), nullable=True))
    op.add_column('invoices', sa.Column('cancellation_authorization_code', sa.String(length=50), nullable=True))
    op.add_column('invoices', sa.Column('cancellation_authorized_at', sa.DateTime(), nullable=True))
    op.add_column('invoices', sa.Column('cancellation_authorized_by', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_invoices_cancellation_authorized_by_users',
        'invoices',
        'users',
        ['cancellation_authorized_by'],
        ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    op.drop_constraint('fk_invoices_cancellation_authorized_by_users', 'invoices', type_='foreignkey')
    op.drop_column('invoices', 'cancellation_authorized_by')
    op.drop_column('invoices', 'cancellation_authorized_at')
    op.drop_column('invoices', 'cancellation_authorization_code')
    op.drop_column('invoices', 'cancellation_reason')
