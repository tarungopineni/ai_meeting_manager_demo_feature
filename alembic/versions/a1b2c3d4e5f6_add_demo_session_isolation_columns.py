"""Add demo session isolation columns

Revision ID: a1b2c3d4e5f6
Revises: 8869f69f7c97
Create Date: 2026-08-30 07:44:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '8869f69f7c97'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Users table
    op.add_column('users', sa.Column('is_demo', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('users', sa.Column('demo_session_id', sa.String(), nullable=True))
    op.add_column('users', sa.Column('demo_session_created_at', sa.DateTime(), nullable=True))
    op.create_index(op.f('ix_users_demo_session_id'), 'users', ['demo_session_id'], unique=False)

    # Tasks table
    op.add_column('tasks', sa.Column('is_demo', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('tasks', sa.Column('demo_session_id', sa.String(), nullable=True))
    op.create_index(op.f('ix_tasks_demo_session_id'), 'tasks', ['demo_session_id'], unique=False)

    # Meetings table
    op.add_column('meetings', sa.Column('is_demo', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('meetings', sa.Column('demo_session_id', sa.String(), nullable=True))
    op.create_index(op.f('ix_meetings_demo_session_id'), 'meetings', ['demo_session_id'], unique=False)


def downgrade() -> None:
    # Meetings table
    op.drop_index(op.f('ix_meetings_demo_session_id'), table_name='meetings')
    op.drop_column('meetings', 'demo_session_id')
    op.drop_column('meetings', 'is_demo')

    # Tasks table
    op.drop_index(op.f('ix_tasks_demo_session_id'), table_name='tasks')
    op.drop_column('tasks', 'demo_session_id')
    op.drop_column('tasks', 'is_demo')

    # Users table
    op.drop_index(op.f('ix_users_demo_session_id'), table_name='users')
    op.drop_column('users', 'demo_session_created_at')
    op.drop_column('users', 'demo_session_id')
    op.drop_column('users', 'is_demo')
