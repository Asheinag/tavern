"""scenes and edges

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-27
"""

import sqlalchemy as sa

from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "scenes",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "game_id", sa.Integer, sa.ForeignKey("games.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("type", sa.String(50), nullable=False, server_default=""),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("color", sa.String(20), nullable=True),
        sa.Column("summary", sa.Text, nullable=False, server_default=""),
        sa.Column("x", sa.Integer, nullable=False, server_default="0"),
        sa.Column("y", sa.Integer, nullable=False, server_default="0"),
        sa.Column("col", sa.Integer, nullable=False, server_default="0"),
        sa.Column("row", sa.Integer, nullable=False, server_default="0"),
    )
    op.create_table(
        "edges",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "game_id", sa.Integer, sa.ForeignKey("games.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column(
            "from_scene_id",
            sa.Integer,
            sa.ForeignKey("scenes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "to_scene_id",
            sa.Integer,
            sa.ForeignKey("scenes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("cond", sa.Text, nullable=True),
    )


def downgrade() -> None:
    op.drop_table("edges")
    op.drop_table("scenes")
