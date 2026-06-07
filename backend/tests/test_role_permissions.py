from collections.abc import Generator
from datetime import UTC, datetime
from subprocess import run

import pytest
from fastapi import APIRouter, Depends
from fastapi.testclient import TestClient
from sqlalchemy import delete, inspect, select
from sqlalchemy.orm import sessionmaker

from app.api.routes.auth import get_authenticated_principal
from app.core.config import Settings
from app.db.models.audit_event import AuditEvent
from app.db.models.company import Company
from app.db.models.company_membership import CompanyMembership
from app.db.models.role_permission import RolePermission
from app.db.models.user import User
from app.db.session import build_engine
from app.main import create_app
from app.platform.auth import AuthenticatedPrincipal
from app.platform.clerk_organizations import ClerkInvitationRecord, get_clerk_organization_client
from app.platform.permissions import (
    CompanyPermissionContext,
    permission_id,
    require_company_permission,
)

DATABASE_URL = "postgresql+psycopg://xai_books:change-me@postgres:5432/xai_books"
ENGINE = build_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=ENGINE, autoflush=False, autocommit=False, expire_on_commit=False)


def build_test_app():
    return create_app(
        Settings(
            app_name="XAI Books API",
            app_version="0.1.0",
            environment="test",
            database_url=DATABASE_URL,
            clerk_secret_key="sk_test_example",
            clerk_publishable_key="pk_test_example",
            clerk_webhook_signing_secret="whsec_test_example",
            clerk_authorized_parties=("http://localhost:5173",),
        )
    )


@pytest.fixture(scope="module", autouse=True)
def ensure_migrations() -> None:
    run(["alembic", "upgrade", "head"], check=True)


@pytest.fixture(autouse=True)
def reset_company_tables() -> Generator[None, None, None]:
    inspector = inspect(ENGINE)
    if not inspector.has_table("users"):
        yield
        return

    with SessionLocal() as session:
        if inspector.has_table("audit_events"):
            session.execute(delete(AuditEvent))
        if inspector.has_table("company_memberships"):
            session.execute(delete(CompanyMembership))
        if inspector.has_table("companies"):
            session.execute(delete(Company))
        session.execute(delete(User))
        session.commit()

    yield


def seed_membership(*, company_id: str, clerk_user_id: str, email: str, role: str) -> None:
    with SessionLocal() as session:
        company = session.get(Company, company_id)
        if company is None:
            company = Company(id=company_id, name="Access Company LLC", slug="access-company-llc", is_active=True)
            session.add(company)

        user = session.scalars(select(User).where(User.clerk_user_id == clerk_user_id)).first()
        if user is None:
            user = User(clerk_user_id=clerk_user_id, primary_email_address=email, is_active=True)
            session.add(user)
            session.flush()

        membership = session.scalars(
            select(CompanyMembership).where(
                CompanyMembership.company_id == company_id,
                CompanyMembership.user_id == user.id,
            )
        ).first()
        if membership is None:
            membership = CompanyMembership(
                clerk_membership_id=f"mem_{clerk_user_id}",
                company_id=company_id,
                user_id=user.id,
                role=role,
                status="active",
            )
            session.add(membership)
        else:
            membership.role = role
            membership.status = "active"

        session.commit()


class FakeClerkOrganizationClient:
    def __init__(self) -> None:
        self.calls: list[tuple[str, dict[str, object]]] = []
        self.pending_invites = [
            ClerkInvitationRecord(
                created_at=datetime(2026, 6, 7, 8, 0, tzinfo=UTC),
                email_address="pending@example.com",
                id="inv_pending_1",
                role="viewer",
                status="pending",
            )
        ]

    def list_pending_invitations(self, company_id: str) -> list[ClerkInvitationRecord]:
        self.calls.append(("list_pending_invitations", {"company_id": company_id}))
        return list(self.pending_invites)

    def invite_member(
        self,
        *,
        company_id: str,
        email_address: str,
        inviter_user_id: str | None,
        message: str | None,
        role: str,
    ) -> ClerkInvitationRecord:
        self.calls.append(
            (
                "invite_member",
                {
                    "company_id": company_id,
                    "email_address": email_address,
                    "inviter_user_id": inviter_user_id,
                    "message": message,
                    "role": role,
                },
            )
        )
        return ClerkInvitationRecord(
            created_at=datetime(2026, 6, 7, 10, 30, tzinfo=UTC),
            email_address=email_address,
            id="inv_created_1",
            role=role,
            status="pending",
        )

    def revoke_invitation(
        self,
        *,
        company_id: str,
        invitation_id: str,
        requesting_user_id: str | None,
    ) -> ClerkInvitationRecord:
        self.calls.append(
            (
                "revoke_invitation",
                {
                    "company_id": company_id,
                    "invitation_id": invitation_id,
                    "requesting_user_id": requesting_user_id,
                },
            )
        )
        return ClerkInvitationRecord(
            created_at=datetime(2026, 6, 7, 8, 0, tzinfo=UTC),
            email_address="pending@example.com",
            id=invitation_id,
            role="viewer",
            status="revoked",
        )

    def update_member_role(self, *, company_id: str, clerk_user_id: str, role: str) -> None:
        self.calls.append(
            (
                "update_member_role",
                {
                    "company_id": company_id,
                    "clerk_user_id": clerk_user_id,
                    "role": role,
                },
            )
        )

    def remove_member(self, *, company_id: str, clerk_user_id: str) -> None:
        self.calls.append(
            (
                "remove_member",
                {
                    "company_id": company_id,
                    "clerk_user_id": clerk_user_id,
                },
            )
        )


def build_permission_probe_router() -> APIRouter:
    router = APIRouter()

    @router.post("/api/v1/companies/{company_id}/permission-probes/settings")
    async def settings_probe(
        permission: CompanyPermissionContext = Depends(require_company_permission("settings:update")),
    ) -> dict[str, str]:
        return {
            "company_id": permission.access.company.id,
            "status": "ok",
        }

    @router.get("/api/v1/companies/{company_id}/permission-probes/audit")
    async def audit_probe(
        permission: CompanyPermissionContext = Depends(require_company_permission("audit:view")),
    ) -> dict[str, str]:
        return {
            "company_id": permission.access.company.id,
            "status": "ok",
        }

    return router


def test_phase2_permission_migration_creates_seeded_role_matrix() -> None:
    inspector = inspect(ENGINE)
    assert inspector.has_table("role_permissions")

    with SessionLocal() as session:
        seeded_permissions = {
            permission_id(row.resource, row.action)
            for row in session.scalars(select(RolePermission)).all()
        }

    assert "users:view" in seeded_permissions
    assert "users:invite" in seeded_permissions
    assert "users:update-role" in seeded_permissions
    assert "users:remove" in seeded_permissions
    assert "settings:update" in seeded_permissions
    assert "audit:view" in seeded_permissions
    assert "reports:export" in seeded_permissions
    assert "company:configure" in seeded_permissions


@pytest.mark.parametrize(
    ("role", "settings_status", "audit_status"),
    [
        ("owner", 200, 200),
        ("admin", 200, 200),
        ("accountant", 403, 200),
        ("viewer", 403, 403),
    ],
)
def test_role_permission_dependency_enforces_settings_and_audit_boundaries(
    role: str,
    settings_status: int,
    audit_status: int,
) -> None:
    company_id = "org_permissions"
    clerk_user_id = f"user_{role}"
    seed_membership(
        company_id=company_id,
        clerk_user_id=clerk_user_id,
        email=f"{role}@example.com",
        role=role,
    )

    app = build_test_app()
    app.include_router(build_permission_probe_router())
    app.dependency_overrides[get_authenticated_principal] = lambda: AuthenticatedPrincipal(
        clerk_user_id=clerk_user_id,
        session_id=f"sess_{role}",
        active_organization_id=company_id,
    )

    with TestClient(app) as client:
        settings_response = client.post(f"/api/v1/companies/{company_id}/permission-probes/settings")
        audit_response = client.get(f"/api/v1/companies/{company_id}/permission-probes/audit")

    assert settings_response.status_code == settings_status
    assert audit_response.status_code == audit_status


def test_team_routes_call_clerk_and_leave_local_shadow_rows_webhook_driven(monkeypatch) -> None:
    company_id = "org_team_roles"
    seed_membership(
        company_id=company_id,
        clerk_user_id="user_owner",
        email="owner@example.com",
        role="owner",
    )
    seed_membership(
        company_id=company_id,
        clerk_user_id="user_member",
        email="member@example.com",
        role="viewer",
    )

    fake_clerk_client = FakeClerkOrganizationClient()
    app = build_test_app()
    app.dependency_overrides[get_authenticated_principal] = lambda: AuthenticatedPrincipal(
        clerk_user_id="user_owner",
        session_id="sess_owner",
        active_organization_id=company_id,
    )
    app.dependency_overrides[get_clerk_organization_client] = lambda: fake_clerk_client

    with TestClient(app) as client:
        list_response = client.get(f"/api/v1/companies/{company_id}/team")
        assert list_response.status_code == 200
        assert list_response.json()["permissions"] == {
            "can_change_roles": True,
            "can_invite_members": True,
            "can_remove_members": True,
        }
        assert list_response.json()["pending_invites"][0]["email_address"] == "pending@example.com"

        invite_response = client.post(
            f"/api/v1/companies/{company_id}/team/invitations",
            json={
                "email_address": "new.accountant@example.com",
                "message": "Please join the finance workspace.",
                "role": "accountant",
            },
        )
        assert invite_response.status_code == 201
        assert invite_response.json()["role"] == "accountant"

        role_update_response = client.patch(
            f"/api/v1/companies/{company_id}/team/members/user_member",
            json={"role": "admin"},
        )
        assert role_update_response.status_code == 200

        revoke_response = client.delete(
            f"/api/v1/companies/{company_id}/team/invitations/inv_pending_1"
        )
        assert revoke_response.status_code == 204

        remove_response = client.delete(f"/api/v1/companies/{company_id}/team/members/user_member")
        assert remove_response.status_code == 204

    assert fake_clerk_client.calls == [
        ("list_pending_invitations", {"company_id": company_id}),
        (
            "invite_member",
            {
                "company_id": company_id,
                "email_address": "new.accountant@example.com",
                "inviter_user_id": "user_owner",
                "message": "Please join the finance workspace.",
                "role": "accountant",
            },
        ),
        (
            "update_member_role",
            {
                "company_id": company_id,
                "clerk_user_id": "user_member",
                "role": "admin",
            },
        ),
        (
            "revoke_invitation",
            {
                "company_id": company_id,
                "invitation_id": "inv_pending_1",
                "requesting_user_id": "user_owner",
            },
        ),
        (
            "remove_member",
            {
                "company_id": company_id,
                "clerk_user_id": "user_member",
            },
        ),
    ]

    with SessionLocal() as session:
        member = session.scalars(
            select(CompanyMembership).where(CompanyMembership.clerk_membership_id == "mem_user_member")
        ).one()
        assert member.role == "viewer"
        assert member.status == "active"

    events = iter(
        [
            {
                "type": "organizationMembership.updated",
                "data": {
                    "id": "mem_user_member",
                    "organization": {"id": company_id},
                    "public_user_data": {"user_id": "user_member"},
                    "role": "admin",
                },
            },
            {
                "type": "organizationMembership.deleted",
                "data": {
                    "id": "mem_user_member",
                    "organization": {"id": company_id},
                    "public_user_data": {"user_id": "user_member"},
                    "role": "admin",
                },
            },
        ]
    )

    monkeypatch.setattr(
        "app.api.routes.auth.verify_clerk_webhook",
        lambda payload, headers, settings: next(events),
    )

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/webhooks/clerk",
            json={"type": "organizationMembership.updated"},
            headers={"svix-id": "msg_updated", "svix-signature": "v1,test", "svix-timestamp": "1"},
        )
        assert response.status_code == 204

        response = client.post(
            "/api/v1/webhooks/clerk",
            json={"type": "organizationMembership.deleted"},
            headers={"svix-id": "msg_deleted", "svix-signature": "v1,test", "svix-timestamp": "1"},
        )
        assert response.status_code == 204

    with SessionLocal() as session:
        member = session.scalars(
            select(CompanyMembership).where(CompanyMembership.clerk_membership_id == "mem_user_member")
        ).one()

    assert member.role == "admin"
    assert member.status == "inactive"


def test_team_routes_deny_mutations_for_unauthorized_roles() -> None:
    company_id = "org_team_denied"
    seed_membership(
        company_id=company_id,
        clerk_user_id="user_viewer",
        email="viewer@example.com",
        role="viewer",
    )

    fake_clerk_client = FakeClerkOrganizationClient()
    app = build_test_app()
    app.dependency_overrides[get_authenticated_principal] = lambda: AuthenticatedPrincipal(
        clerk_user_id="user_viewer",
        session_id="sess_viewer",
        active_organization_id=company_id,
    )
    app.dependency_overrides[get_clerk_organization_client] = lambda: fake_clerk_client

    with TestClient(app) as client:
        list_response = client.get(f"/api/v1/companies/{company_id}/team")
        assert list_response.status_code == 200
        assert list_response.json()["permissions"] == {
            "can_change_roles": False,
            "can_invite_members": False,
            "can_remove_members": False,
        }

        invite_response = client.post(
            f"/api/v1/companies/{company_id}/team/invitations",
            json={"email_address": "blocked@example.com", "role": "viewer"},
        )
        role_update_response = client.patch(
            f"/api/v1/companies/{company_id}/team/members/user_viewer",
            json={"role": "admin"},
        )
        remove_response = client.delete(f"/api/v1/companies/{company_id}/team/members/user_viewer")

    assert invite_response.status_code == 403
    assert role_update_response.status_code == 403
    assert remove_response.status_code == 403
    assert invite_response.json()["detail"] == "You do not have permission to do that in Access Company LLC."
    assert fake_clerk_client.calls == [
        ("list_pending_invitations", {"company_id": company_id}),
    ]
