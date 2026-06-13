"""Add company settings columns and audit events.

Revision ID: 0005_phase2_audit_settings
Revises: 0004_phase2_permissions
Create Date: 2026-06-07 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0005_phase2_audit_settings"
down_revision: str | None = "0004_phase2_permissions"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("companies", sa.Column("legal_name", sa.String(length=160), nullable=True))
    op.add_column("companies", sa.Column("business_activity", sa.String(length=160), nullable=True))
    op.add_column("companies", sa.Column("trn", sa.String(length=32), nullable=True))
    op.add_column(
        "companies",
        sa.Column(
            "vat_registration_status",
            sa.String(length=32),
            nullable=False,
            server_default="not_registered",
        ),
    )
    op.add_column("companies", sa.Column("registered_address", sa.Text(), nullable=True))
    op.add_column(
        "companies",
        sa.Column("default_currency", sa.String(length=3), nullable=False, server_default="AED"),
    )
    op.add_column(
        "companies",
        sa.Column(
            "default_vat_rate",
            sa.Numeric(5, 2),
            nullable=False,
            server_default="5.00",
        ),
    )

    op.create_table(
        "audit_events",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("company_id", sa.String(length=64), nullable=False),
        sa.Column("actor_clerk_user_id", sa.String(length=64), nullable=True),
        sa.Column("session_id", sa.String(length=64), nullable=True),
        sa.Column("entity_type", sa.String(length=64), nullable=False),
        sa.Column("entity_id", sa.String(length=128), nullable=False),
        sa.Column("action", sa.String(length=128), nullable=False),
        sa.Column("before_state", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("after_state", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
    )
    op.create_index("ix_audit_events_company_id", "audit_events", ["company_id"], unique=False)
    op.create_index(
        "ix_audit_events_actor_clerk_user_id",
        "audit_events",
        ["actor_clerk_user_id"],
        unique=False,
    )
    op.create_index("ix_audit_events_action", "audit_events", ["action"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_audit_events_action", table_name="audit_events")
    op.drop_index("ix_audit_events_actor_clerk_user_id", table_name="audit_events")
    op.drop_index("ix_audit_events_company_id", table_name="audit_events")
    op.drop_table("audit_events")

    op.drop_column("companies", "default_vat_rate")
    op.drop_column("companies", "default_currency")
    op.drop_column("companies", "registered_address")
    op.drop_column("companies", "vat_registration_status")
    op.drop_column("companies", "trn")
    op.drop_column("companies", "business_activity")
    op.drop_column("companies", "legal_name")
