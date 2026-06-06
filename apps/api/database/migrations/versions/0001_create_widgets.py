"""create widgets

Revision ID: 0001
Revises:
Create Date: 2026-06-06 00:00:00.000000
"""
from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "widgets",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        # Logical foreign reference to the SHARED Item (lives upstream) — no local FK.
        sa.Column("item_id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_widgets_item_id", "widgets", ["item_id"])


def downgrade() -> None:
    op.drop_index("ix_widgets_item_id", table_name="widgets")
    op.drop_table("widgets")
