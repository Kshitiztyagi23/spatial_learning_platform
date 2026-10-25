"""feedback_item_and_requested

Revision ID: a7b8c9d0e1f2
Revises: f1a2b3c4d5e6
Create Date: 2026-10-20 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a7b8c9d0e1f2'
down_revision: Union[str, None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('feedback_events', sa.Column('item_id', sa.String(), nullable=True))
    op.add_column('feedback_events', sa.Column('requested', sa.Boolean(), nullable=True))


def downgrade() -> None:
    op.drop_column('feedback_events', 'requested')
    op.drop_column('feedback_events', 'item_id')
