"""add is_primary flag to media table"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd5b2c4c1a1f3'
down_revision = 'c7a8b9d0e1f2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'media',
        sa.Column(
            'is_primary',
            sa.Boolean(),
            nullable=False,
            server_default=sa.text('0'),
        ),
    )
    op.execute("UPDATE media SET is_primary = 0 WHERE is_primary IS NULL")
    with op.batch_alter_table('media') as batch_op:
        batch_op.alter_column('is_primary', server_default=None)


def downgrade() -> None:
    with op.batch_alter_table('media') as batch_op:
        batch_op.drop_column('is_primary')
