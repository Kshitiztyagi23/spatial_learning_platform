"""lego_event_puzzle_and_results

Revision ID: b7c1e2d4f9a0
Revises: 4bef16f0c354
Create Date: 2026-10-07 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7c1e2d4f9a0'
down_revision: Union[str, None] = '4bef16f0c354'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('lego_events', sa.Column('puzzle_id', sa.String(), nullable=True))
    op.add_column('lego_events', sa.Column('details_json', sa.String(), nullable=True))
    op.add_column('lego_submissions', sa.Column('results_json', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('lego_submissions', 'results_json')
    op.drop_column('lego_events', 'details_json')
    op.drop_column('lego_events', 'puzzle_id')
