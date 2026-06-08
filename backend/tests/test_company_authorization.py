from collections.abc import Generator
from subprocess import run

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, inspect
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


def test_phase2_company_migration_creates_company_tables() -> None:
    inspector = inspect(ENGINE)

    assert inspector.has_table("companies")
    assert inspector.has_table("company_memberships")


def test_company_route_returns_current_company_for_active_member() -> None:
    app = build_test_app()
    app.dependency_overrides[get_authenticated_principal] = lambda: AuthenticatedPrincipal(
        clerk_user_id="user_company_access",
        session_id="sess_company_access",
        active_organization_id="org_accessible",
    )

    with SessionLocal() as session:
        user = User(
            clerk_user_id="user_company_access",
            primary_email_address="owner@example.com",
            is_active=True,
        )
        company = Company(
            id="org_accessible",
            name="Accessible Company LLC",
            slug="accessible-company-llc",
            is_active=True,
        )
        session.add_all([user, company])
        session.flush()
        session.add(
            CompanyMembership(
                clerk_membership_id="mem_accessible",
                company_id=company.id,
                user_id=user.id,
                role="owner",
                status="active",
            )
        )
        session.commit()

    with TestClient(app) as client:
        response = client.get("/api/v1/companies/org_accessible")

    assert response.status_code == 200
    assert response.json()["id"] == "org_accessible"
    assert response.json()["name"] == "Accessible Company LLC"


def test_company_route_rejects_foreign_company_access_with_403() -> None:
    app = build_test_app()
    app.dependency_overrides[get_authenticated_principal] = lambda: AuthenticatedPrincipal(
        clerk_user_id="user_company_access",
        session_id="sess_company_access",
        active_organization_id="org_accessible",
    )

    with SessionLocal() as session:
        user = User(
            clerk_user_id="user_company_access",
            primary_email_address="owner@example.com",
            is_active=True,
        )
        company_a = Company(
            id="org_accessible",
            name="Accessible Company LLC",
            slug="accessible-company-llc",
            is_active=True,
        )
        company_b = Company(
            id="org_forbidden",
            name="Forbidden Company LLC",
            slug="forbidden-company-llc",
            is_active=True,
        )
        session.add_all([user, company_a, company_b])
        session.flush()
        session.add(
            CompanyMembership(
                clerk_membership_id="mem_accessible",
                company_id=company_a.id,
                user_id=user.id,
                role="owner",
                status="active",
            )
        )
        session.commit()

    with TestClient(app) as client:
        response = client.get("/api/v1/companies/org_forbidden")

    assert response.status_code == 403
    assert response.json()["detail"] == "You do not have access to this company"


def test_company_route_rejects_foreign_company_access_before_any_company_lookup(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app = build_test_app()
    app.dependency_overrides[get_authenticated_principal] = lambda: AuthenticatedPrincipal(
        clerk_user_id="user_company_access",
        session_id="sess_company_access",
        active_organization_id="org_accessible",
    )

    async def unexpected_execute(*args, **kwargs):  # type: ignore[no-untyped-def]
        raise AssertionError("foreign-company requests must fail before any company-scoped query runs")

    monkeypatch.setattr("app.platform.company_access.AsyncSession.execute", unexpected_execute)

    with TestClient(app) as client:
        response = client.get("/api/v1/companies/org_forbidden")

    assert response.status_code == 403
    assert response.json()["detail"] == "You do not have access to this company"


def test_company_and_membership_webhook_events_materialize_sync_and_tombstone_rows(monkeypatch) -> None:
    app = build_test_app()

    with SessionLocal() as session:
        session.add(
            User(
                clerk_user_id="user_company_webhook",
                primary_email_address="member@example.com",
                is_active=True,
            )
        )
        session.commit()

    events = iter(
        [
            {
                "type": "organization.created",
                "data": {
                    "id": "org_webhook",
                    "name": "Webhook Company LLC",
                    "slug": "webhook-company-llc",
                    "image_url": "https://img.example.com/company.png",
                },
            },
            {
                "type": "organization.updated",
                "data": {
                    "id": "org_webhook",
                    "name": "Webhook Company Holdings LLC",
                    "slug": "webhook-company-holdings-llc",
                    "image_url": "https://img.example.com/company-updated.png",
                },
            },
            {
                "type": "organizationMembership.created",
                "data": {
                    "id": "mem_webhook",
                    "organization": {"id": "org_webhook"},
                    "public_user_data": {"user_id": "user_company_webhook"},
                    "role": "admin",
                },
            },
            {
                "type": "organizationMembership.updated",
                "data": {
                    "id": "mem_webhook",
                    "organization": {"id": "org_webhook"},
                    "public_user_data": {"user_id": "user_company_webhook"},
                    "role": "viewer",
                },
            },
            {
                "type": "organizationMembership.deleted",
                "data": {
                    "id": "mem_webhook",
                    "organization": {"id": "org_webhook"},
                    "public_user_data": {"user_id": "user_company_webhook"},
                    "role": "viewer",
                },
            },
            {
                "type": "organization.deleted",
                "data": {
                    "id": "org_webhook",
                },
            },
        ]
    )

    monkeypatch.setattr(
        "app.api.routes.auth.verify_clerk_webhook",
        lambda payload, headers, settings: next(events),
    )

    with TestClient(app) as client:
        for event_type in (
            "organization.created",
            "organization.updated",
            "organizationMembership.created",
            "organizationMembership.updated",
            "organizationMembership.deleted",
            "organization.deleted",
        ):
            response = client.post(
                "/api/v1/webhooks/clerk",
                json={"type": event_type},
                headers={"svix-id": f"msg_{event_type}", "svix-signature": "v1,test", "svix-timestamp": "1"},
            )
            assert response.status_code == 204

    with SessionLocal() as session:
        company = session.query(Company).filter(Company.id == "org_webhook").one()
        membership = (
            session.query(CompanyMembership)
            .filter(CompanyMembership.clerk_membership_id == "mem_webhook")
            .one()
        )

    assert company.name == "Webhook Company Holdings LLC"
    assert company.slug == "webhook-company-holdings-llc"
    assert company.is_active is False
    assert membership.role == "viewer"
    assert membership.status == "inactive"
