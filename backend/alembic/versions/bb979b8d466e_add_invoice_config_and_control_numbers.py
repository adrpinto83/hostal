"""Add invoice configuration and control numbers for Venezuelan compliance

Revision ID: bb979b8d466e
Revises: phase1_stripe_and_invoice_system
Create Date: 2025-11-22

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime

# revision identifiers, used by Alembic.
revision = 'bb979b8d466e'
down_revision = 'phase1_stripe_and_invoice_system'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Upgrade: Add invoice configuration and control number tracking for Venezuelan invoicing"""

    # Create invoice_configurations table
    op.create_table(
        'invoice_configurations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('company_name', sa.String(255), nullable=False),
        sa.Column('company_rif', sa.String(50), nullable=False, unique=True),
        sa.Column('address', sa.String(255), nullable=False),
        sa.Column('city', sa.String(100), nullable=False),
        sa.Column('state', sa.String(100), nullable=False),
        sa.Column('postal_code', sa.String(10), nullable=True),
        sa.Column('phone', sa.String(50), nullable=True),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('website', sa.String(255), nullable=True),
        sa.Column('tax_percentage', sa.Float(), nullable=False, server_default='16.0'),
        sa.Column('enable_iva_retention', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('iva_retention_percentage', sa.Float(), nullable=False, server_default='75.0'),
        sa.Column('enable_islr_retention', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('islr_retention_percentage', sa.Float(), nullable=False, server_default='0.75'),
        sa.Column('invoice_series', sa.String(10), nullable=False, server_default='A'),
        sa.Column('next_invoice_number', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('seniat_authorization_number', sa.String(50), nullable=True),
        sa.Column('seniat_authorization_date', sa.Date(), nullable=True),
        sa.Column('logo_path', sa.String(500), nullable=True),
        sa.Column('invoice_header_color', sa.String(7), nullable=False, server_default='#1a3a52'),
        sa.Column('invoice_footer_text', sa.Text(), nullable=True),
        sa.Column('payment_terms', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_invoice_config_rif', 'invoice_configurations', ['company_rif'])

    # Create invoice_control_numbers table for SENIAT compliance
    op.create_table(
        'invoice_control_numbers',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('control_number', sa.String(50), nullable=False, unique=True),
        sa.Column('series', sa.String(10), nullable=False),
        sa.Column('random_digits', sa.String(8), nullable=False),
        sa.Column('check_digit', sa.Integer(), nullable=False),
        sa.Column('invoice_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(50), nullable=False, server_default='available'),
        sa.Column('assigned_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_control_number_number', 'invoice_control_numbers', ['control_number'])
    op.create_index('idx_control_number_series', 'invoice_control_numbers', ['series'])
    op.create_index('idx_control_number_invoice', 'invoice_control_numbers', ['invoice_id'])
    op.create_index('idx_control_number_status', 'invoice_control_numbers', ['status'])


def downgrade() -> None:
    """Downgrade: Remove invoice configuration and control number tables"""
    op.drop_index('idx_control_number_status', table_name='invoice_control_numbers')
    op.drop_index('idx_control_number_invoice', table_name='invoice_control_numbers')
    op.drop_index('idx_control_number_series', table_name='invoice_control_numbers')
    op.drop_index('idx_control_number_number', table_name='invoice_control_numbers')
    op.drop_table('invoice_control_numbers')
    op.drop_index('idx_invoice_config_rif', table_name='invoice_configurations')
    op.drop_table('invoice_configurations')
