"""round_schedule_and_session_feedback

Revision ID: d6e2f3a4b5c7
Revises: c4d8e1f2a3b5
Create Date: 2026-10-07 23:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd6e2f3a4b5c7'
down_revision: Union[str, None] = 'c4d8e1f2a3b5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Null schedule = the recommended design until a researcher saves one
    op.add_column('study_protocols', sa.Column('round_schedule_json', sa.Text(), nullable=True))
    # Null on older sessions = the old rule (experimental group gets hints)
    op.add_column('sessions', sa.Column('feedback_stages_json', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('sessions', 'feedback_stages_json')
    op.drop_column('study_protocols', 'round_schedule_json')
