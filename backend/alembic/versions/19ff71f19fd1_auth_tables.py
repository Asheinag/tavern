"""auth tables

Revision ID: 19ff71f19fd1
Revises: 0005
Create Date: 2026-07-10 22:01:27.639013

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "19ff71f19fd1"
down_revision: str | Sequence[str] | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "auth_sessions",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "characters",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("avatar", sa.Text(), nullable=True),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "invite_codes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("created_by", sa.Integer(), nullable=False),
        sa.Column("used_by", sa.Integer(), nullable=True),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["used_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_table(
        "game_players",
        sa.Column("game_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("character_id", sa.Integer(), nullable=True),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["character_id"], ["characters.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["game_id"], ["games.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("game_id", "user_id"),
    )
    # Добавляем новые колонки со server_default, чтобы не упасть на существующих строках
    op.add_column(
        "users",
        sa.Column("username", sa.String(100), nullable=False, server_default="dev_master"),
    )
    op.add_column(
        "users",
        sa.Column("password_hash", sa.String(255), nullable=False, server_default="dev"),
    )
    op.add_column("users", sa.Column("avatar", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("bio", sa.Text(), nullable=True))
    op.add_column(
        "users",
        sa.Column("system_role", sa.String(20), nullable=False, server_default="user"),
    )
    # Убираем server_default после заполнения существующих строк
    op.alter_column("users", "username", server_default=None)
    op.alter_column("users", "password_hash", server_default=None)
    op.alter_column("users", "system_role", server_default=None)
    op.drop_constraint("users_email_key", "users", type_="unique")
    op.create_unique_constraint(None, "users", ["username"])
    op.drop_column("users", "email")
    op.drop_column("users", "name")
    op.drop_column("users", "avatar_color")


def downgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "avatar_color",
            sa.VARCHAR(length=20),
            server_default=sa.text("'#6c757d'::character varying"),
            nullable=False,
        ),
    )
    op.add_column(
        "users",
        sa.Column("name", sa.VARCHAR(length=100), nullable=False, server_default=""),
    )
    op.add_column("users", sa.Column("email", sa.VARCHAR(length=255), nullable=True))
    op.drop_constraint(None, "users", type_="unique")
    op.create_unique_constraint(
        "users_email_key", "users", ["email"], postgresql_nulls_not_distinct=False
    )
    op.drop_column("users", "system_role")
    op.drop_column("users", "bio")
    op.drop_column("users", "avatar")
    op.drop_column("users", "password_hash")
    op.drop_column("users", "username")
    op.drop_table("game_players")
    op.drop_table("invite_codes")
    op.drop_table("characters")
    op.drop_table("auth_sessions")
