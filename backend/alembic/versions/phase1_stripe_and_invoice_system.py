"""Add invoice and stripe models for payment system phase 1

Revision ID: phase1_stripe_and_invoice_system
Revises: f865836eb2f7_expand_payment_method_enum
Create Date: 2025-11-20

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'phase1_stripe_and_invoice_system'
down_revision = '70412c1f9804'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Upgrade: Add new tables for Stripe integration and invoicing"""

    # Try to create enums, but ignore if they already exist
    # 1. Create invoice_status enum type
    try:
        invoice_status = postgresql.ENUM(
            'draft', 'issued', 'sent', 'viewed', 'pending',
            'partially_paid', 'paid', 'overdue', 'cancelled', 'refunded',
            name='invoice_status',
            create_type=False  # Don't try to create, will use existing
        )
    except:
        # If enum doesn't exist, create it separately
        op.execute("""
            CREATE TYPE invoice_status AS ENUM (
                'draft', 'issued', 'sent', 'viewed', 'pending',
                'partially_paid', 'paid', 'overdue', 'cancelled', 'refunded'
            )
        """)
        invoice_status = postgresql.ENUM(
            'draft', 'issued', 'sent', 'viewed', 'pending',
            'partially_paid', 'paid', 'overdue', 'cancelled', 'refunded',
            name='invoice_status',
            create_type=False
        )

    # 2. Create invoice_line_item_type enum type
    try:
        op.execute("""
            CREATE TYPE invoice_line_item_type AS ENUM (
                'room_charge', 'service', 'tax', 'discount', 'fee', 'other'
            )
        """)
    except:
        pass

    invoice_line_type = postgresql.ENUM(
        'room_charge', 'service', 'tax', 'discount', 'fee', 'other',
        name='invoice_line_item_type',
        create_type=False
    )

    # 3. Create webhook_event_type enum type
    try:
        op.execute("""
            CREATE TYPE webhook_event_type AS ENUM (
                'payment_intent.succeeded', 'payment_intent.payment_failed',
                'payment_intent.canceled', 'payment_intent.amount_capturable_updated',
                'charge.succeeded', 'charge.failed', 'charge.refunded', 'charge.captured',
                'charge.dispute.created', 'customer.created', 'customer.updated',
                'customer.deleted', 'payment_method.attached', 'payment_method.detached'
            )
        """)
    except:
        pass

    webhook_event_type = postgresql.ENUM(
        'payment_intent.succeeded', 'payment_intent.payment_failed',
        'payment_intent.canceled', 'payment_intent.amount_capturable_updated',
        'charge.succeeded', 'charge.failed', 'charge.refunded', 'charge.captured',
        'charge.dispute.created', 'customer.created', 'customer.updated',
        'customer.deleted', 'payment_method.attached', 'payment_method.detached',
        name='webhook_event_type',
        create_type=False
    )

    # 4. Create webhook_processing_status enum type
    try:
        op.execute("""
            CREATE TYPE webhook_processing_status AS ENUM (
                'pending', 'processing', 'success', 'failed', 'skipped', 'retry'
            )
        """)
    except:
        pass

    webhook_processing_status = postgresql.ENUM(
        'pending', 'processing', 'success', 'failed', 'skipped', 'retry',
        name='webhook_processing_status',
        create_type=False
    )

    # 5. Create transaction_type enum type
    try:
        op.execute("""
            CREATE TYPE transaction_type AS ENUM (
                'payment', 'refund', 'deposit', 'adjustment', 'invoice',
                'expense', 'fee', 'tip', 'credit'
            )
        """)
    except:
        pass

    transaction_type = postgresql.ENUM(
        'payment', 'refund', 'deposit', 'adjustment', 'invoice',
        'expense', 'fee', 'tip', 'credit',
        name='transaction_type',
        create_type=False
    )

    # 6. Create transaction_status enum type
    try:
        op.execute("""
            CREATE TYPE transaction_status AS ENUM (
                'pending', 'processing', 'completed', 'failed',
                'refunded', 'disputed'
            )
        """)
    except:
        pass

    transaction_status = postgresql.ENUM(
        'pending', 'processing', 'completed', 'failed',
        'refunded', 'disputed',
        name='transaction_status',
        create_type=False
    )

    # 7. Create payment_gateway enum type
    try:
        op.execute("""
            CREATE TYPE payment_gateway AS ENUM (
                'stripe', 'paypal', 'manual', 'bank_transfer', 'cash',
                'mobile_payment', 'crypto', 'other'
            )
        """)
    except:
        pass

    payment_gateway = postgresql.ENUM(
        'stripe', 'paypal', 'manual', 'bank_transfer', 'cash',
        'mobile_payment', 'crypto', 'other',
        name='payment_gateway',
        create_type=False
    )

    # 8. Create invoices table
    op.create_table(
        'invoices',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('guest_id', sa.Integer(), nullable=False),
        sa.Column('reservation_id', sa.Integer(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('invoice_number', sa.String(50), nullable=False, unique=True),
        sa.Column('issue_date', sa.DateTime(), nullable=False),
        sa.Column('due_date', sa.DateTime(), nullable=False),
        sa.Column('paid_date', sa.DateTime(), nullable=True),
        sa.Column('subtotal', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('tax_amount', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('total', sa.Float(), nullable=False),
        sa.Column('paid_amount', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('remaining_balance', sa.Float(), nullable=False),
        sa.Column('total_usd', sa.Float(), nullable=True),
        sa.Column('total_eur', sa.Float(), nullable=True),
        sa.Column('exchange_rates', sa.JSON(), nullable=True),
        sa.Column('status', invoice_status, nullable=False, server_default='draft'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('terms_conditions', sa.Text(), nullable=True),
        sa.Column('pdf_url', sa.String(500), nullable=True),
        sa.Column('pdf_generated_at', sa.DateTime(), nullable=True),
        sa.Column('email_sent_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('email_sent_at', sa.DateTime(), nullable=True),
        sa.Column('email_viewed_at', sa.DateTime(), nullable=True),
        sa.Column('viewed_by_guest', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['guest_id'], ['guests.id'], ),
        sa.ForeignKeyConstraint(['reservation_id'], ['reservations.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_invoice_guest_date', 'invoices', ['guest_id', 'issue_date'])
    op.create_index('idx_invoice_status_date', 'invoices', ['status', 'issue_date'])
    op.create_index('idx_invoice_due_date', 'invoices', ['due_date'])
    op.create_index('idx_invoice_invoice_number', 'invoices', ['invoice_number'])

    # 9. Create invoice_line_items table
    op.create_table(
        'invoice_line_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('invoice_id', sa.Integer(), nullable=False),
        sa.Column('description', sa.String(500), nullable=False),
        sa.Column('item_type', invoice_line_type, nullable=False, server_default='service'),
        sa.Column('quantity', sa.Float(), nullable=False, server_default='1.0'),
        sa.Column('unit_price', sa.Float(), nullable=False),
        sa.Column('total_price', sa.Float(), nullable=False),
        sa.Column('discount_percent', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('discount_amount', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_line_item_invoice', 'invoice_line_items', ['invoice_id'])

    # 10. Create invoice_payments table
    op.create_table(
        'invoice_payments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('invoice_id', sa.Integer(), nullable=False),
        sa.Column('payment_id', sa.Integer(), nullable=True),
        sa.Column('amount_paid', sa.Float(), nullable=False),
        sa.Column('currency', sa.String(3), nullable=False, server_default='VES'),
        sa.Column('payment_date', sa.DateTime(), nullable=False),
        sa.Column('payment_method', sa.String(50), nullable=False),
        sa.Column('transaction_id', sa.String(200), nullable=True, unique=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('recorded_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], ),
        sa.ForeignKeyConstraint(['payment_id'], ['payments.id'], ),
        sa.ForeignKeyConstraint(['recorded_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_invoice_payment_invoice', 'invoice_payments', ['invoice_id'])
    op.create_index('idx_invoice_payment_date', 'invoice_payments', ['payment_date'])

    # 11. Create stripe_webhook_events table
    op.create_table(
        'stripe_webhook_events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('event_id', sa.String(100), nullable=False, unique=True),
        sa.Column('event_type', webhook_event_type, nullable=False),
        sa.Column('event_timestamp', sa.DateTime(), nullable=False),
        sa.Column('payload', sa.JSON(), nullable=False),
        sa.Column('payment_intent_id', sa.String(100), nullable=True),
        sa.Column('charge_id', sa.String(100), nullable=True),
        sa.Column('customer_id', sa.String(100), nullable=True),
        sa.Column('amount', sa.Integer(), nullable=True),
        sa.Column('currency', sa.String(3), nullable=True),
        sa.Column('processing_status', webhook_processing_status, nullable=False, server_default='pending'),
        sa.Column('processed', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('processed_at', sa.DateTime(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('error_traceback', sa.Text(), nullable=True),
        sa.Column('retry_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_retry_at', sa.DateTime(), nullable=True),
        sa.Column('next_retry_at', sa.DateTime(), nullable=True),
        sa.Column('received_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_webhook_event_status_timestamp', 'stripe_webhook_events',
                    ['processing_status', 'event_timestamp'])
    op.create_index('idx_webhook_event_type_timestamp', 'stripe_webhook_events',
                    ['event_type', 'event_timestamp'])
    op.create_index('idx_webhook_payment_intent', 'stripe_webhook_events', ['payment_intent_id'])
    op.create_index('idx_webhook_charge', 'stripe_webhook_events', ['charge_id'])
    op.create_index('idx_webhook_retry', 'stripe_webhook_events',
                    ['processing_status', 'next_retry_at'])
    op.create_index('idx_webhook_event_id', 'stripe_webhook_events', ['event_id'])

    # 12. Create stripe_webhook_logs table
    op.create_table(
        'stripe_webhook_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('webhook_event_id', sa.Integer(), nullable=False),
        sa.Column('event_id', sa.String(100), nullable=False),
        sa.Column('action', sa.String(100), nullable=False),
        sa.Column('status', sa.String(50), nullable=False),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column('duration_ms', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_webhook_log_event', 'stripe_webhook_logs', ['event_id'])
    op.create_index('idx_webhook_log_action', 'stripe_webhook_logs', ['action'])
    op.create_index('idx_webhook_log_created', 'stripe_webhook_logs', ['created_at'])

    # 13. Create financial_transactions table
    op.create_table(
        'financial_transactions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('transaction_type', transaction_type, nullable=False),
        sa.Column('status', transaction_status, nullable=False, server_default='pending'),
        sa.Column('invoice_id', sa.Integer(), nullable=True),
        sa.Column('payment_id', sa.Integer(), nullable=True),
        sa.Column('guest_id', sa.Integer(), nullable=True),
        sa.Column('reservation_id', sa.Integer(), nullable=True),
        sa.Column('created_by_user_id', sa.Integer(), nullable=True),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('currency', sa.String(3), nullable=False, server_default='VES'),
        sa.Column('amount_ves', sa.Float(), nullable=False),
        sa.Column('gateway', payment_gateway, nullable=False),
        sa.Column('gateway_transaction_id', sa.String(200), nullable=True),
        sa.Column('gateway_reference', sa.String(200), nullable=True),
        sa.Column('description', sa.String(500), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('error_code', sa.String(100), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('transaction_date', sa.DateTime(), nullable=False),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], ),
        sa.ForeignKeyConstraint(['payment_id'], ['payments.id'], ),
        sa.ForeignKeyConstraint(['guest_id'], ['guests.id'], ),
        sa.ForeignKeyConstraint(['reservation_id'], ['reservations.id'], ),
        sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_transaction_guest_date', 'financial_transactions', ['guest_id', 'transaction_date'])
    op.create_index('idx_transaction_type_date', 'financial_transactions', ['transaction_type', 'transaction_date'])
    op.create_index('idx_transaction_status_date', 'financial_transactions', ['status', 'transaction_date'])
    op.create_index('idx_transaction_gateway_date', 'financial_transactions', ['gateway', 'transaction_date'])
    op.create_index('idx_transaction_invoice', 'financial_transactions', ['invoice_id'])
    op.create_index('idx_transaction_payment', 'financial_transactions', ['payment_id'])
    op.create_index('idx_transaction_gateway_ref', 'financial_transactions', ['gateway_transaction_id'])

    # 14. Create exchange_rate_snapshots table
    op.create_table(
        'exchange_rate_snapshots',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('ves_to_usd', sa.Float(), nullable=False),
        sa.Column('ves_to_eur', sa.Float(), nullable=False),
        sa.Column('usd_to_eur', sa.Float(), nullable=False),
        sa.Column('source', sa.String(100), nullable=False),
        sa.Column('is_manual', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('snapshot_date', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_rate_snapshot_date', 'exchange_rate_snapshots', ['snapshot_date'])

    # 15. Add Stripe fields to payments table
    op.add_column('payments',
                  sa.Column('stripe_payment_intent_id', sa.String(255), nullable=True, unique=True))
    op.add_column('payments',
                  sa.Column('stripe_charge_id', sa.String(255), nullable=True, unique=True))
    op.add_column('payments',
                  sa.Column('stripe_payment_method_id', sa.String(255), nullable=True))
    op.add_column('payments',
                  sa.Column('stripe_status', sa.String(50), nullable=True))
    op.add_column('payments',
                  sa.Column('stripe_metadata', sa.JSON(), nullable=True))
    op.add_column('payments',
                  sa.Column('stripe_error_code', sa.String(100), nullable=True))
    op.add_column('payments',
                  sa.Column('stripe_error_message', sa.Text(), nullable=True))
    op.add_column('payments',
                  sa.Column('webhook_processed', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('payments',
                  sa.Column('webhook_processed_at', sa.DateTime(), nullable=True))
    op.add_column('payments',
                  sa.Column('stripe_webhook_event_id', sa.String(100), nullable=True))
    op.add_column('payments',
                  sa.Column('stripe_attempt_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('payments',
                  sa.Column('stripe_last_error_at', sa.DateTime(), nullable=True))
    op.add_column('payments',
                  sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()))

    op.create_index('idx_payment_stripe_intent', 'payments', ['stripe_payment_intent_id'])
    op.create_index('idx_payment_stripe_charge', 'payments', ['stripe_charge_id'])
    op.create_index('idx_payment_status_date', 'payments', ['status', 'payment_date'])
    op.create_index('idx_payment_guest_date', 'payments', ['guest_id', 'payment_date'])


def downgrade() -> None:
    """Downgrade: Remove all tables and enums created in upgrade"""

    # Drop indices from payments
    op.drop_index('idx_payment_guest_date', table_name='payments')
    op.drop_index('idx_payment_status_date', table_name='payments')
    op.drop_index('idx_payment_stripe_charge', table_name='payments')
    op.drop_index('idx_payment_stripe_intent', table_name='payments')

    # Drop columns from payments
    op.drop_column('payments', 'updated_at')
    op.drop_column('payments', 'stripe_last_error_at')
    op.drop_column('payments', 'stripe_attempt_count')
    op.drop_column('payments', 'stripe_webhook_event_id')
    op.drop_column('payments', 'webhook_processed_at')
    op.drop_column('payments', 'webhook_processed')
    op.drop_column('payments', 'stripe_error_message')
    op.drop_column('payments', 'stripe_error_code')
    op.drop_column('payments', 'stripe_metadata')
    op.drop_column('payments', 'stripe_status')
    op.drop_column('payments', 'stripe_payment_method_id')
    op.drop_column('payments', 'stripe_charge_id')
    op.drop_column('payments', 'stripe_payment_intent_id')

    # Drop tables
    op.drop_table('exchange_rate_snapshots')
    op.drop_table('financial_transactions')
    op.drop_table('stripe_webhook_logs')
    op.drop_table('stripe_webhook_events')
    op.drop_table('invoice_payments')
    op.drop_table('invoice_line_items')
    op.drop_table('invoices')

    # Drop enum types
    op.execute('DROP TYPE IF EXISTS payment_gateway;')
    op.execute('DROP TYPE IF EXISTS transaction_status;')
    op.execute('DROP TYPE IF EXISTS transaction_type;')
    op.execute('DROP TYPE IF EXISTS webhook_processing_status;')
    op.execute('DROP TYPE IF EXISTS webhook_event_type;')
    op.execute('DROP TYPE IF EXISTS invoice_line_item_type;')
    op.execute('DROP TYPE IF EXISTS invoice_status;')
