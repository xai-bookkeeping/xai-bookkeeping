"""Create the fixed role-permission foundation for company access.

Revision ID: 0004_phase2_permissions
Revises: 0003_phase2_companies
Create Date: 2026-06-07 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0004_phase2_permissions"
down_revision: str | None = "0003_phase2_companies"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


SEEDED_ROLE_PERMISSIONS = (
    ("owner", "audit", "view"),
    ("owner", "company", "configure"),
    ("owner", "records", "approve"),
    ("owner", "records", "create"),
    ("owner", "records", "delete"),
    ("owner", "records", "edit"),
    ("owner", "records", "view"),
    ("owner", "reports", "export"),
    ("owner", "reports", "view"),
    ("owner", "settings", "update"),
    ("owner", "users", "invite"),
    ("owner", "users", "remove"),
    ("owner", "users", "update-role"),
    ("owner", "users", "view"),
    ("admin", "audit", "view"),
    ("admin", "records", "approve"),
    ("admin", "records", "create"),
    ("admin", "records", "delete"),
    ("admin", "records", "edit"),
    ("admin", "records", "view"),
    ("admin", "reports", "export"),
    ("admin", "reports", "view"),
    ("admin", "settings", "update"),
    ("admin", "users", "invite"),
    ("admin", "users", "remove"),
    ("admin", "users", "update-role"),
    ("admin", "users", "view"),
    ("accountant", "audit", "view"),
    ("accountant", "records", "approve"),
    ("accountant", "records", "create"),
    ("accountant", "records", "edit"),
    ("accountant", "records", "view"),
    ("accountant", "reports", "export"),
    ("accountant", "reports", "view"),
    ("accountant", "users", "view"),
    ("viewer", "records", "view"),
    ("viewer", "reports", "view"),
    ("viewer", "users", "view"),
)


def upgrade() -> None:
    op.create_table(
        "role_permissions",
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column("resource", sa.String(length=64), nullable=False),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.PrimaryKeyConstraint("role", "resource", "action"),
        sa.UniqueConstraint(
            "role",
            "resource",
            "action",
            name="uq_role_permissions_role_resource_action",
        ),
    )

    role_permissions = sa.table(
        "role_permissions",
        sa.column("role", sa.String),
        sa.column("resource", sa.String),
        sa.column("action", sa.String),
    )
    op.bulk_insert(
        role_permissions,
        [
            {
                "action": action,
                "resource": resource,
                "role": role,
            }
            for role, resource, action in SEEDED_ROLE_PERMISSIONS
        ],
    )


def downgrade() -> None:
    op.drop_table("role_permissions")
