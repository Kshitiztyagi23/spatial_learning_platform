"""active_round_and_run_label

Revision ID: f1a2b3c4d5e6
Revises: e8f9a0b1c2d3
Create Date: 2026-10-08 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, None] = 'e8f9a0b1c2d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('study_protocols', sa.Column('active_round', sa.Integer(), nullable=True))
    op.add_column('study_protocols', sa.Column('run_label', sa.String(), nullable=True))
    op.add_column('sessions', sa.Column('run_label', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('sessions', 'run_label')
    op.drop_column('study_protocols', 'run_label')
    op.drop_column('study_protocols', 'active_round')
