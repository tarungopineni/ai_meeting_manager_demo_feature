"""Create VerifiedByManager column for tasks column

Revision ID: 8869f69f7c97
Revises: 
Create Date: 2026-07-03 18:19:23.062049

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8869f69f7c97'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('tasks', sa.Column('verified_by_manager', sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    op.drop_column('tasks', 'verified_by_manager')
