"""park_attempts_and_scene_maps (+ session_reports)

Revision ID: b8c9d0e1f2a3
Revises: a7b8c9d0e1f2
Create Date: 2026-10-20 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b8c9d0e1f2a3'
down_revision: Union[str, None] = 'a7b8c9d0e1f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'answer_attempts',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('task_instance_id', sa.String(), sa.ForeignKey('task_instances.id'), nullable=False),
        sa.Column('item_id', sa.String(), nullable=False),
        sa.Column('answer', sa.String(), nullable=False),
        sa.Column('is_correct', sa.Boolean(), nullable=False),
        sa.Column('attempt_number', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_answer_attempts_instance_item', 'answer_attempts', ['task_instance_id', 'item_id'])
    op.create_table(
        'scenario_maps',
        sa.Column('scenario_id', sa.Integer(), primary_key=True),
        sa.Column('map_text', sa.Text(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('model', sa.String(), nullable=True),
        sa.Column('generated_at', sa.DateTime(), nullable=False),
        sa.Column('approved_at', sa.DateTime(), nullable=True),
    )
    op.create_table(
        'session_reports',
        sa.Column('session_id', sa.String(), sa.ForeignKey('sessions.id'), primary_key=True),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('facts_json', sa.Text(), nullable=False),
        sa.Column('report_json', sa.Text(), nullable=True),
        sa.Column('model', sa.String(), nullable=True),
        sa.Column('prompt_version', sa.String(), nullable=True),
        sa.Column('error', sa.String(), nullable=True),
        sa.Column('generated_at', sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('session_reports')
    op.drop_table('scenario_maps')
    op.drop_index('ix_answer_attempts_instance_item', table_name='answer_attempts')
    op.drop_table('answer_attempts')
