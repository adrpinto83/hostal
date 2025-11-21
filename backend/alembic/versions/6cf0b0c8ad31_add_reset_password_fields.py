"""add reset password fields to users

Revision ID: 6cf0b0c8ad31
Revises: d5b2c4c1a1f3
Create Date: 2025-11-13 15:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '6cf0b0c8ad31'
down_revision: Union[str, None] = 'd5b2c4c1a1f3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('reset_password_token', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('reset_password_expires_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'reset_password_expires_at')
    op.drop_column('users', 'reset_password_token')
