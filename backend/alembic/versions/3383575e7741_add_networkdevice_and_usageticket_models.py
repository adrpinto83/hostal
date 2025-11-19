"""Add NetworkDevice and UsageTicket models for network integration"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '3383575e7741'
down_revision = 'f865836eb2f7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enums for NetworkDevice
    device_brand = postgresql.ENUM(
        'ubiquiti', 'mikrotik', 'cisco', 'tp_link', 'asus', 'dlink', 'netgear', 'aruba', 'fortinet', 'other',
        name='device_brand'
    )
    device_brand.create(op.get_bind())

    device_type = postgresql.ENUM(
        'switch', 'router', 'access_point', 'firewall', 'controller', 'modem',
        name='device_type'
    )
    device_type.create(op.get_bind())

    connection_status = postgresql.ENUM(
        'connected', 'disconnected', 'error', 'testing',
        name='connection_status'
    )
    connection_status.create(op.get_bind())

    auth_type = postgresql.ENUM(
        'username_password', 'api_key', 'token', 'certificate', 'ssh_key',
        name='auth_type'
    )
    auth_type.create(op.get_bind())

    # Create enums for UsageTicket
    ticket_type = postgresql.ENUM(
        'block', 'unblock', 'suspension', 'quota_exceeded', 'bandwidth_limit',
        'device_registration', 'network_incident', 'manual_intervention', 'automatic_action', 'other',
        name='ticket_type'
    )
    ticket_type.create(op.get_bind())

    ticket_status = postgresql.ENUM(
        'open', 'in_progress', 'resolved', 'closed', 'pending', 'cancelled',
        name='ticket_status'
    )
    ticket_status.create(op.get_bind())

    ticket_priority = postgresql.ENUM(
        'low', 'medium', 'high', 'critical',
        name='ticket_priority'
    )
    ticket_priority.create(op.get_bind())

    action_status = postgresql.ENUM(
        'pending', 'in_progress', 'success', 'failed', 'partial',
        name='action_status'
    )
    action_status.create(op.get_bind())

    # Create network_devices table
    op.create_table('network_devices',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('brand', postgresql.ENUM('ubiquiti', 'mikrotik', 'cisco', 'tp_link', 'asus', 'dlink', 'netgear', 'aruba', 'fortinet', 'other', name='device_brand'), nullable=False),
        sa.Column('device_type', postgresql.ENUM('switch', 'router', 'access_point', 'firewall', 'controller', 'modem', name='device_type'), nullable=False),
        sa.Column('ip_address', sa.String(length=45), nullable=False),
        sa.Column('mac_address', sa.String(length=17), nullable=True),
        sa.Column('network_interface', sa.String(length=50), nullable=True),
        sa.Column('auth_type', postgresql.ENUM('username_password', 'api_key', 'token', 'certificate', 'ssh_key', name='auth_type'), nullable=False),
        sa.Column('username', sa.String(length=100), nullable=True),
        sa.Column('password', sa.String(length=255), nullable=True),
        sa.Column('api_key', sa.String(length=500), nullable=True),
        sa.Column('api_secret', sa.String(length=500), nullable=True),
        sa.Column('certificate_path', sa.String(length=500), nullable=True),
        sa.Column('port', sa.Integer(), nullable=False, server_default='22'),
        sa.Column('use_ssl', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('verify_ssl', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('timeout_seconds', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('connection_status', postgresql.ENUM('connected', 'disconnected', 'error', 'testing', name='connection_status'), nullable=False, server_default='disconnected'),
        sa.Column('last_connection_attempt', sa.DateTime(), nullable=True),
        sa.Column('last_successful_connection', sa.DateTime(), nullable=True),
        sa.Column('last_error_message', sa.Text(), nullable=True),
        sa.Column('total_operations', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('failed_operations', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('success_rate', sa.Float(), nullable=False, server_default='100.0'),
        sa.Column('supports_mac_blocking', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('supports_bandwidth_control', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('supports_vlan', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('supports_firewall_rules', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('supports_traffic_shaping', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('vendor_config', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_network_devices_name', 'network_devices', ['name'])
    op.create_index('ix_network_devices_brand', 'network_devices', ['brand'])
    op.create_index('ix_network_devices_device_type', 'network_devices', ['device_type'])
    op.create_index('ix_network_devices_ip_address', 'network_devices', ['ip_address'], unique=True)
    op.create_index('ix_network_devices_is_active', 'network_devices', ['is_active'])
    op.create_index('ix_network_devices_connection_status', 'network_devices', ['connection_status'])

    # Create usage_tickets table
    op.create_table('usage_tickets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('ticket_number', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('ticket_type', postgresql.ENUM('block', 'unblock', 'suspension', 'quota_exceeded', 'bandwidth_limit', 'device_registration', 'network_incident', 'manual_intervention', 'automatic_action', 'other', name='ticket_type'), nullable=False),
        sa.Column('status', postgresql.ENUM('open', 'in_progress', 'resolved', 'closed', 'pending', 'cancelled', name='ticket_status'), nullable=False, server_default='open'),
        sa.Column('priority', postgresql.ENUM('low', 'medium', 'high', 'critical', name='ticket_priority'), nullable=False, server_default='medium'),
        sa.Column('guest_id', sa.Integer(), nullable=True),
        sa.Column('device_id', sa.Integer(), nullable=True),
        sa.Column('network_device_id', sa.Integer(), nullable=True),
        sa.Column('mac_address', sa.String(length=17), nullable=True),
        sa.Column('device_name', sa.String(length=100), nullable=True),
        sa.Column('action_type', sa.String(length=50), nullable=False),
        sa.Column('action_status', postgresql.ENUM('pending', 'in_progress', 'success', 'failed', 'partial', name='action_status'), nullable=False, server_default='pending'),
        sa.Column('affected_devices_count', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('bandwidth_limit_mbps', sa.Float(), nullable=True),
        sa.Column('quota_limit_gb', sa.Float(), nullable=True),
        sa.Column('duration_minutes', sa.Integer(), nullable=True),
        sa.Column('is_temporary', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('assigned_to', sa.Integer(), nullable=True),
        sa.Column('resolved_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('scheduled_action_time', sa.DateTime(), nullable=True),
        sa.Column('action_executed_at', sa.DateTime(), nullable=True),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('resolution_notes', sa.Text(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('metadata_json', postgresql.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['assigned_to'], ['users.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['device_id'], ['devices.id'], ),
        sa.ForeignKeyConstraint(['guest_id'], ['guests.id'], ),
        sa.ForeignKeyConstraint(['network_device_id'], ['network_devices.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['resolved_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_usage_tickets_ticket_number', 'usage_tickets', ['ticket_number'], unique=True)
    op.create_index('ix_usage_tickets_ticket_type', 'usage_tickets', ['ticket_type'])
    op.create_index('ix_usage_tickets_status', 'usage_tickets', ['status'])
    op.create_index('ix_usage_tickets_priority', 'usage_tickets', ['priority'])
    op.create_index('ix_usage_tickets_action_status', 'usage_tickets', ['action_status'])
    op.create_index('ix_usage_tickets_guest_id', 'usage_tickets', ['guest_id'])
    op.create_index('ix_usage_tickets_device_id', 'usage_tickets', ['device_id'])
    op.create_index('ix_usage_tickets_network_device_id', 'usage_tickets', ['network_device_id'])
    op.create_index('ix_usage_tickets_mac_address', 'usage_tickets', ['mac_address'])
    op.create_index('ix_usage_tickets_created_at', 'usage_tickets', ['created_at'])


def downgrade() -> None:
    # Drop tables
    op.drop_table('usage_tickets')
    op.drop_table('network_devices')

    # Drop enums
    op.execute('DROP TYPE IF EXISTS action_status CASCADE')
    op.execute('DROP TYPE IF EXISTS ticket_priority CASCADE')
    op.execute('DROP TYPE IF EXISTS ticket_status CASCADE')
    op.execute('DROP TYPE IF EXISTS ticket_type CASCADE')
    op.execute('DROP TYPE IF EXISTS auth_type CASCADE')
    op.execute('DROP TYPE IF EXISTS connection_status CASCADE')
    op.execute('DROP TYPE IF EXISTS device_type CASCADE')
    op.execute('DROP TYPE IF EXISTS device_brand CASCADE')
