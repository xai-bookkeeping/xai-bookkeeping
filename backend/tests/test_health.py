from fastapi.routing import APIRoute
from fastapi.testclient import TestClient

from app.api.routes.health import HealthResponse
from app.core.config import Settings
from app.main import create_app


def test_health_route_exposes_response_model() -> None:
    app = create_app()
    route = next(
        route for route in app.routes if isinstance(route, APIRoute) and route.path == "/health"
    )

    assert route.response_model is HealthResponse


def test_health_endpoint_returns_typed_metadata() -> None:
    app = create_app(
        Settings(
            app_name="XAI Books API",
            app_version="0.1.0",
            environment="test",
            database_url="postgresql+psycopg://xai_books:change-me@postgres:5432/xai_books",
        )
    )

    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "application": {
            "name": "XAI Books API",
            "version": "0.1.0",
            "environment": "test",
        },
        "database": {
            "status": "configured",
            "configured": True,
            "driver": "postgresql+psycopg",
            "host": "postgres",
            "database": "xai_books",
        },
    }


def test_health_endpoint_allows_local_frontend_origin() -> None:
    app = create_app(
        Settings(
            app_name="XAI Books API",
            app_version="0.1.0",
            environment="test",
            database_url="postgresql+psycopg://xai_books:change-me@postgres:5432/xai_books",
        )
    )

    with TestClient(app) as client:
        response = client.get(
            "/health",
            headers={"Origin": "http://localhost:5173"},
        )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
