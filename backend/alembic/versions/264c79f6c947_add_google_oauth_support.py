"""Add Google OAuth and user approval system

Revision ID: 264c79f6c947
Revises: 0009_add_file_hash_to_media
Create Date: 2024-11-12 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '264c79f6c947'
down_revision = '0009_add_file_hash_to_media'
branch_labels = None
depends_on = None


def upgrade():
    # Add new columns to users table
    op.add_column('users', sa.Column('approved', sa.Boolean(), server_default=sa.false(), nullable=False))
    op.add_column('users', sa.Column('google_id', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('auth_provider', sa.String(50), server_default='email', nullable=False))
    op.add_column('users', sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False))
    op.add_column('users', sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False))
    op.add_column('users', sa.Column('full_name', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('profile_picture', sa.String(255), nullable=True))

    # Make hashed_password nullable for Google OAuth users
    with op.batch_alter_table('users') as batch_op:
        batch_op.alter_column('hashed_password', existing_type=sa.String(255), nullable=True)

    # Create indexes
    op.create_index('ix_users_google_id', 'users', ['google_id'], unique=True)
    op.create_index('ix_users_approved', 'users', ['approved'], unique=False)


def downgrade():
    # Remove indexes
    op.drop_index('ix_users_approved', table_name='users')
    op.drop_index('ix_users_google_id', table_name='users')

    # Remove columns
    op.drop_column('users', 'profile_picture')
    op.drop_column('users', 'full_name')
    op.drop_column('users', 'updated_at')
    op.drop_column('users', 'created_at')
    op.drop_column('users', 'auth_provider')
    op.drop_column('users', 'google_id')
    op.drop_column('users', 'approved')

    # Restore hashed_password as NOT NULL
    with op.batch_alter_table('users') as batch_op:
        batch_op.alter_column('hashed_password', existing_type=sa.String(255), nullable=False)
