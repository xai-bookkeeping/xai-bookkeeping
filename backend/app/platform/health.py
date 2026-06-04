"""Platform-level health helpers for the FastAPI backend."""

from typing import Literal

from pydantic import BaseModel
from sqlalchemy.engine import make_url
from sqlalchemy.exc import ArgumentError

from app.core.config import Settings


class ApplicationMetadata(BaseModel):
    name: str
    version: str
    environment: str


class DatabaseReadiness(BaseModel):
    status: Literal["configured", "unconfigured", "invalid"]
    configured: bool
    driver: str | None = None
    host: str | None = None
    database: str | None = None


class HealthResponse(BaseModel):
    status: Literal["ok"]
    application: ApplicationMetadata
    database: DatabaseReadiness


def describe_database(database_url: str | None) -> DatabaseReadiness:
    if not database_url:
        return DatabaseReadiness(status="unconfigured", configured=False)

    try:
        url = make_url(database_url)
    except (ArgumentError, ValueError):
        return DatabaseReadiness(status="invalid", configured=False)

    return DatabaseReadiness(
        status="configured",
        configured=True,
        driver=url.drivername,
        host=url.host,
        database=url.database,
    )


def build_health_response(settings: Settings) -> HealthResponse:
    return HealthResponse(
        status="ok",
        application=ApplicationMetadata(
            name=settings.app_name,
            version=settings.app_version,
            environment=settings.environment,
        ),
        database=describe_database(settings.database_url),
    )
