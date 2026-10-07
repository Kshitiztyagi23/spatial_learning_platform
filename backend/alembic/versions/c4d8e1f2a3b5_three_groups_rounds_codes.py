"""three_groups_rounds_codes

Revision ID: c4d8e1f2a3b5
Revises: b7c1e2d4f9a0
Create Date: 2026-10-07 21:00:00.000000

"""
import json
import secrets
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4d8e1f2a3b5'
down_revision: Union[str, None] = 'b7c1e2d4f9a0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def upgrade() -> None:
    op.add_column('study_protocols', sa.Column('condition_split_json', sa.Text(), nullable=True))
    op.add_column('study_protocols', sa.Column('total_rounds', sa.Integer(), nullable=True))
    op.add_column('participants', sa.Column('participant_code', sa.String(), nullable=True))
    op.create_unique_constraint('uq_participants_participant_code', 'participants', ['participant_code'])
    op.add_column('feedback_events', sa.Column('generated_by', sa.String(), nullable=True))

    conn = op.get_bind()

    # Keep the existing two-group split until a researcher sets three groups
    for row in conn.execute(sa.text("SELECT id, ai_feedback_percentage FROM study_protocols")):
        pct = max(0, min(100, row.ai_feedback_percentage or 50))
        split = {"experimental": pct, "control": 100 - pct, "natural_control": 0}
        conn.execute(
            sa.text("UPDATE study_protocols SET condition_split_json = :split, total_rounds = 3 WHERE id = :id"),
            {"split": json.dumps(split), "id": row.id},
        )

    # Existing participants get codes so they can return for later rounds
    used: set[str] = set()
    for row in conn.execute(sa.text("SELECT id FROM participants WHERE participant_code IS NULL")):
        code = "".join(secrets.choice(CODE_ALPHABET) for _ in range(6))
        while code in used:
            code = "".join(secrets.choice(CODE_ALPHABET) for _ in range(6))
        used.add(code)
        conn.execute(
            sa.text("UPDATE participants SET participant_code = :code WHERE id = :id"),
            {"code": code, "id": row.id},
        )


def downgrade() -> None:
    op.drop_column('feedback_events', 'generated_by')
    op.drop_constraint('uq_participants_participant_code', 'participants', type_='unique')
    op.drop_column('participants', 'participant_code')
    op.drop_column('study_protocols', 'total_rounds')
    op.drop_column('study_protocols', 'condition_split_json')
