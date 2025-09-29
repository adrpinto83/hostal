<%text>
This is a template file for Alembic migrations.
</%text>
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '${up_revision}'
down_revision = ${repr(down_revision)}
branch_labels = ${repr(branch_labels)}
depends_on = ${repr(depends_on)}

def upgrade():
    ${upgrades or "pass"}

def downgrade():
    ${downgrades or "pass"}
