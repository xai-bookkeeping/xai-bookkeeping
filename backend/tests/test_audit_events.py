from collections.abc import Generator
from subprocess import run

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, inspect, select
from sqlalchemy.orm import sessionmaker

from app.api.routes.auth import get_authenticated_principal
from app.core.config import Settings
from app.db.models.audit_event import AuditEvent
from app.db.models.company import Company
from app.db.models.company_membership import CompanyMembership
from app.db.models.user import User
from app.db.session import build_engine
from app.main import create_app
from app.platform.auth import AuthenticatedPrincipal
from app.platform.clerk_organizations import ClerkInvitationRecord, get_clerk_organization_client

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
def reset_tables() -> Generator[None, None, None]:
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
            company = Company(id=company_id, name=f"{company_id} LLC", slug=f"{company_id}-llc", is_active=True)
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
            session.add(
                CompanyMembership(
                    clerk_membership_id=f"mem_{clerk_user_id}",
                    company_id=company_id,
                    user_id=user.id,
                    role=role,
                    status="active",
                )
            )
        else:
            membership.role = role
            membership.status = "active"

        session.commit()


class FakeClerkOrganizationClient:
    def __init__(self) -> None:
        self.calls: list[tuple[str, dict[str, object]]] = []

    def list_pending_invitations(self, company_id: str) -> list[ClerkInvitationRecord]:
        self.calls.append(("list_pending_invitations", {"company_id": company_id}))
        return []

    def invite_member(self, **kwargs) -> ClerkInvitationRecord:
        self.calls.append(("invite_member", kwargs))
        return ClerkInvitationRecord(
            created_at=None,
            email_address=str(kwargs["email_address"]),
            id="inv_test",
            role=str(kwargs["role"]),
            status="pending",
        )

    def revoke_invitation(self, **kwargs) -> ClerkInvitationRecord:
        self.calls.append(("revoke_invitation", kwargs))
        return ClerkInvitationRecord(
            created_at=None,
            email_address="pending@example.com",
            id=str(kwargs["invitation_id"]),
            role="viewer",
            status="revoked",
        )

    def update_member_role(self, **kwargs) -> None:
        self.calls.append(("update_member_role", kwargs))

    def remove_member(self, **kwargs) -> None:
        self.calls.append(("remove_member", kwargs))


def test_phase2_audit_migration_creates_audit_events_table() -> None:
    inspector = inspect(ENGINE)
    assert inspector.has_table("audit_events")


def test_auth_me_records_a_single_company_scoped_login_event_per_session() -> None:
    company_id = "org_login_audit"
    seed_membership(
        company_id=company_id,
        clerk_user_id="user_owner",
        email="owner@example.com",
        role="owner",
    )

    app = build_test_app()
    app.dependency_overrides[get_authenticated_principal] = lambda: AuthenticatedPrincipal(
        clerk_user_id="user_owner",
        session_id="sess_login_once",
        active_organization_id=company_id,
    )

    with TestClient(app) as client:
        first = client.get("/api/v1/auth/me")
        second = client.get("/api/v1/auth/me")

    assert first.status_code == 200
    assert second.status_code == 200

    with SessionLocal() as session:
        events = (
            session.query(AuditEvent)
            .filter(AuditEvent.company_id == company_id, AuditEvent.action == "auth.login_success")
            .all()
        )

    assert len(events) == 1
    assert events[0].entity_id == "sess_login_once"


def test_team_member_removal_writes_audit_rows_and_audit_reads_are_company_scoped() -> None:
    company_id = "org_audit_company"
    other_company_id = "org_other_company"
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
    seed_membership(
        company_id=company_id,
        clerk_user_id="user_viewer",
        email="viewer@example.com",
        role="viewer",
    )
    seed_membership(
        company_id=other_company_id,
        clerk_user_id="user_other_owner",
        email="other@example.com",
        role="owner",
    )

    with SessionLocal() as session:
        session.add(
            AuditEvent(
                action="company.settings_updated",
                actor_clerk_user_id="user_other_owner",
                after_state={"legal_name": "Other Company LLC"},
                before_state=None,
                company_id=other_company_id,
                entity_id=other_company_id,
                entity_type="company",
                session_id="sess_other",
            )
        )
        session.commit()

    fake_clerk_client = FakeClerkOrganizationClient()
    app = build_test_app()
    app.dependency_overrides[get_authenticated_principal] = lambda: AuthenticatedPrincipal(
        clerk_user_id="user_owner",
        session_id="sess_owner",
        active_organization_id=company_id,
    )
    app.dependency_overrides[get_clerk_organization_client] = lambda: fake_clerk_client

    with TestClient(app) as client:
        response = client.delete(f"/api/v1/companies/{company_id}/team/members/user_member")
        assert response.status_code == 204

        audit_response = client.get(f"/api/v1/companies/{company_id}/audit-events")

    assert audit_response.status_code == 200
    assert fake_clerk_client.calls == [
        (
            "remove_member",
            {
                "clerk_user_id": "user_member",
                "company_id": company_id,
            },
        )
    ]

    payload = audit_response.json()
    assert payload["events"][0]["action"] == "team.member_removed"
    assert payload["events"][0]["company_id"] == company_id
    assert payload["events"][0]["before_state"]["role"] == "viewer"
    assert payload["events"][0]["after_state"]["status"] == "removed"
    assert all(event["company_id"] == company_id for event in payload["events"])

    viewer_app = build_test_app()
    viewer_app.dependency_overrides[get_authenticated_principal] = lambda: AuthenticatedPrincipal(
        clerk_user_id="user_viewer",
        session_id="sess_viewer",
        active_organization_id=company_id,
    )

    with TestClient(viewer_app) as client:
        denied = client.get(f"/api/v1/companies/{company_id}/audit-events")

    assert denied.status_code == 403
