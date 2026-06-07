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
def reset_user_table() -> Generator[None, None, None]:
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


def test_auth_me_rejects_missing_authenticated_request_state() -> None:
    app = build_test_app()

    with TestClient(app) as client:
        response = client.get("/api/v1/auth/me")

    assert response.status_code == 401


def test_clerk_webhook_rejects_unsigned_requests() -> None:
    app = build_test_app()

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/webhooks/clerk",
            json={
                "type": "user.created",
                "data": {"id": "user_test"},
                "object": "event",
                "timestamp": 1,
            },
        )

    assert response.status_code == 400


def test_phase2_auth_migration_creates_users_table() -> None:
    inspector = inspect(ENGINE)

    assert inspector.has_table("users")


def test_auth_me_returns_local_user_for_authenticated_principal() -> None:
    app = build_test_app()
    app.dependency_overrides[get_authenticated_principal] = lambda: AuthenticatedPrincipal(
        clerk_user_id="user_test_auth_me",
        session_id="sess_test_auth_me",
        active_organization_id="org_test_auth_me",
    )

    with SessionLocal() as session:
        session.add(
            User(
                clerk_user_id="user_test_auth_me",
                primary_email_address="owner@example.com",
                first_name="Aisha",
                last_name="Owner",
                username="aisha",
                image_url="https://img.example.com/aisha.png",
                is_active=True,
            )
        )
        session.commit()

    with TestClient(app) as client:
        response = client.get("/api/v1/auth/me")

    assert response.status_code == 200
    assert response.json()["clerk_user_id"] == "user_test_auth_me"
    assert response.json()["primary_email_address"] == "owner@example.com"
    assert response.json()["is_active"] is True


def test_clerk_user_webhook_events_upsert_and_deactivate_shadow_rows(monkeypatch) -> None:
    app = build_test_app()
    events = iter(
        [
            {
                "type": "user.created",
                "data": {
                    "id": "user_webhook_test",
                    "first_name": "Mali",
                    "last_name": "Example",
                    "username": "mali",
                    "image_url": "https://img.example.com/mali.png",
                    "primary_email_address_id": "email_1",
                    "email_addresses": [
                        {"id": "email_1", "email_address": "mali@example.com"},
                    ],
                },
            },
            {
                "type": "user.updated",
                "data": {
                    "id": "user_webhook_test",
                    "first_name": "Maliha",
                    "last_name": "Example",
                    "username": "mali",
                    "image_url": "https://img.example.com/maliha.png",
                    "primary_email_address_id": "email_2",
                    "email_addresses": [
                        {"id": "email_2", "email_address": "maliha@example.com"},
                    ],
                },
            },
            {
                "type": "user.deleted",
                "data": {
                    "id": "user_webhook_test",
                },
            },
        ]
    )

    monkeypatch.setattr(
        "app.api.routes.auth.verify_clerk_webhook",
        lambda payload, headers, settings: next(events),
    )

    with TestClient(app) as client:
        created = client.post(
            "/api/v1/webhooks/clerk",
            json={"type": "user.created"},
            headers={"svix-id": "msg_1", "svix-signature": "v1,test", "svix-timestamp": "1"},
        )
        updated = client.post(
            "/api/v1/webhooks/clerk",
            json={"type": "user.updated"},
            headers={"svix-id": "msg_2", "svix-signature": "v1,test", "svix-timestamp": "1"},
        )
        deleted = client.post(
            "/api/v1/webhooks/clerk",
            json={"type": "user.deleted"},
            headers={"svix-id": "msg_3", "svix-signature": "v1,test", "svix-timestamp": "1"},
        )

    assert created.status_code == 204
    assert updated.status_code == 204
    assert deleted.status_code == 204

    with SessionLocal() as session:
        user = session.query(User).filter(User.clerk_user_id == "user_webhook_test").one()

    assert user.primary_email_address == "maliha@example.com"
    assert user.first_name == "Maliha"
    assert user.is_active is False
