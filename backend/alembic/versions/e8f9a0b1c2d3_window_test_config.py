"""window_test_config

Revision ID: e8f9a0b1c2d3
Revises: d6e2f3a4b5c7
Create Date: 2026-10-08 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e8f9a0b1c2d3'
down_revision: Union[str, None] = 'd6e2f3a4b5c7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Null = default window test config (all 24 questions, untimed)
    op.add_column('study_protocols', sa.Column('window_config_json', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('study_protocols', 'window_config_json')
