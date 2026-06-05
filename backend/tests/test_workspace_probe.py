from collections.abc import Generator
from subprocess import run

import pytest
from fastapi import FastAPI
from fastapi.routing import APIRoute
from fastapi.testclient import TestClient
from sqlalchemy import delete
from sqlalchemy.orm import sessionmaker

from app.api.routes.workspace_probe import WorkspaceProbeResponse
from app.core.config import Settings
from app.db.models.workspace_probe import WorkspaceProbeRun
from app.db.session import build_engine
from app.main import create_app

DATABASE_URL = "postgresql+psycopg://xai_books:change-me@postgres:5432/xai_books"
ENGINE = build_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=ENGINE, autoflush=False, autocommit=False, expire_on_commit=False)


@pytest.fixture(scope="module", autouse=True)
def ensure_migrations() -> None:
    run(["alembic", "upgrade", "head"], check=True)


@pytest.fixture(autouse=True)
def reset_workspace_probe_table() -> Generator[None, None, None]:
    with SessionLocal() as session:
        session.execute(delete(WorkspaceProbeRun))
        session.commit()
    yield


def build_test_app() -> FastAPI:
    return create_app(
        Settings(
            app_name="XAI Books API",
            app_version="0.1.0",
            environment="test",
            database_url=DATABASE_URL,
        )
    )


def test_workspace_probe_routes_expose_response_models() -> None:
    app = build_test_app()
    routes = {
        route.path: route
        for route in app.routes
        if isinstance(route, APIRoute)
    }

    assert routes["/workspace-probe"].response_model is WorkspaceProbeResponse
    assert routes["/workspace-probe/latest"].response_model is WorkspaceProbeResponse


def test_workspace_probe_write_then_read_round_trip() -> None:
    app = build_test_app()

    with TestClient(app) as client:
        created = client.post("/workspace-probe", json={"source": "workspace-probe-test"})

        assert created.status_code == 201
        created_payload = created.json()
        assert created_payload["source"] == "workspace-probe-test"
        assert created_payload["status"] == "completed"
        assert created_payload["id"] > 0

        latest = client.get("/workspace-probe/latest")

    assert latest.status_code == 200
    assert latest.json() == created_payload


def test_workspace_probe_allows_local_frontend_preflight() -> None:
    app = build_test_app()

    with TestClient(app) as client:
        response = client.options(
            "/workspace-probe",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "POST" in response.headers["access-control-allow-methods"]
