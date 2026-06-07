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


def test_company_settings_route_returns_uae_defaults_for_authorized_member() -> None:
    company_id = "org_settings_defaults"
    seed_membership(
        company_id=company_id,
        clerk_user_id="user_owner",
        email="owner@example.com",
        role="owner",
    )

    app = build_test_app()
    app.dependency_overrides[get_authenticated_principal] = lambda: AuthenticatedPrincipal(
        clerk_user_id="user_owner",
        session_id="sess_owner",
        active_organization_id=company_id,
    )

    with TestClient(app) as client:
        response = client.get(f"/api/v1/companies/{company_id}/settings")

    assert response.status_code == 200
    assert response.json()["legal_name"] == "Access Company LLC"
    assert response.json()["default_currency"] == "AED"
    assert response.json()["default_vat_rate"] == "5.00"
    assert response.json()["vat_registration_status"] == "not_registered"


@pytest.mark.parametrize(
    ("role", "expected_status"),
    [
        ("owner", 200),
        ("admin", 200),
        ("accountant", 403),
        ("viewer", 403),
    ],
)
def test_company_settings_update_enforces_role_guards_and_writes_audit_rows(
    role: str,
    expected_status: int,
) -> None:
    company_id = f"org_settings_{role}"
    clerk_user_id = f"user_{role}"
    seed_membership(
        company_id=company_id,
        clerk_user_id=clerk_user_id,
        email=f"{role}@example.com",
        role=role,
    )

    app = build_test_app()
    app.dependency_overrides[get_authenticated_principal] = lambda: AuthenticatedPrincipal(
        clerk_user_id=clerk_user_id,
        session_id=f"sess_{role}",
        active_organization_id=company_id,
    )

    payload = {
        "business_activity": "General trading",
        "legal_name": "Updated Access Company LLC",
        "registered_address": "Dubai Marina, Dubai, UAE",
        "trn": "100123456700003",
        "vat_registration_status": "registered",
    }

    with TestClient(app) as client:
        response = client.patch(f"/api/v1/companies/{company_id}/settings", json=payload)

    assert response.status_code == expected_status

    with SessionLocal() as session:
        company = session.get(Company, company_id)
        audit_events = (
            session.query(AuditEvent)
            .filter(AuditEvent.company_id == company_id, AuditEvent.action == "company.settings_updated")
            .all()
        )

    if expected_status == 200:
        assert company is not None
        assert company.legal_name == "Updated Access Company LLC"
        assert company.business_activity == "General trading"
        assert company.trn == "100123456700003"
        assert company.vat_registration_status == "registered"
        assert len(audit_events) == 1
    else:
        assert company is not None
        assert company.legal_name is None
        assert audit_events == []


def test_company_settings_update_rejects_invalid_trn() -> None:
    company_id = "org_settings_invalid_trn"
    seed_membership(
        company_id=company_id,
        clerk_user_id="user_owner",
        email="owner@example.com",
        role="owner",
    )

    app = build_test_app()
    app.dependency_overrides[get_authenticated_principal] = lambda: AuthenticatedPrincipal(
        clerk_user_id="user_owner",
        session_id="sess_owner",
        active_organization_id=company_id,
    )

    with TestClient(app) as client:
        response = client.patch(
            f"/api/v1/companies/{company_id}/settings",
            json={
                "business_activity": "General trading",
                "legal_name": "Invalid TRN Company LLC",
                "registered_address": "Dubai, UAE",
                "trn": "12345",
                "vat_registration_status": "registered",
            },
        )

    assert response.status_code == 422
