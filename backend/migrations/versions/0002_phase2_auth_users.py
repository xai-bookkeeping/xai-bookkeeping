"""Create Clerk-backed user shadow rows.

Revision ID: 0002_phase2_auth_users
Revises: 0001_workspace_probe
Create Date: 2026-06-07 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0002_phase2_auth_users"
down_revision: str | None = "0001_workspace_probe"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("clerk_user_id", sa.String(length=64), nullable=False),
        sa.Column("primary_email_address", sa.String(length=320), nullable=True),
        sa.Column("first_name", sa.String(length=120), nullable=True),
        sa.Column("last_name", sa.String(length=120), nullable=True),
        sa.Column("username", sa.String(length=120), nullable=True),
        sa.Column("image_url", sa.String(length=512), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.UniqueConstraint("clerk_user_id", name="uq_users_clerk_user_id"),
    )
    op.create_index("ix_users_clerk_user_id", "users", ["clerk_user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_users_clerk_user_id", table_name="users")
    op.drop_table("users")
