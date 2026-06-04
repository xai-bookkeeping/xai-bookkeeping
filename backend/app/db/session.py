from collections.abc import Generator
from functools import lru_cache

from fastapi import Depends
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import Settings
from app.core.config import get_settings


def build_engine(database_url: str) -> Engine:
    """Build a SQLAlchemy engine for the configured PostgreSQL URL."""

    return create_engine(database_url, pool_pre_ping=True)


@lru_cache(maxsize=8)
def get_engine(database_url: str) -> Engine:
    """Return a cached engine for the provided database URL."""

    return build_engine(database_url)


@lru_cache(maxsize=8)
def get_session_factory(database_url: str) -> sessionmaker[Session]:
    """Create the reusable session factory."""

    return sessionmaker(
        bind=get_engine(database_url),
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
    )


def get_db_session(settings: Settings = Depends(get_settings)) -> Generator[Session, None, None]:
    """Yield a request-scoped SQLAlchemy session."""

    if settings.database_url is None:
        raise RuntimeError("DATABASE_URL is required for the backend database session")

    session = get_session_factory(settings.database_url)()
    try:
        yield session
    finally:
        session.close()
