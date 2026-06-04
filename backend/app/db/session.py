from collections.abc import Generator
from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings


def build_engine(database_url: str) -> Engine:
    """Build a SQLAlchemy engine for the configured PostgreSQL URL."""

    return create_engine(database_url, pool_pre_ping=True)


@lru_cache(maxsize=1)
def get_engine() -> Engine:
    """Return the shared engine configured from backend settings."""

    settings = get_settings()
    if settings.database_url is None:
        raise RuntimeError("DATABASE_URL is required for the backend database session")
    return build_engine(settings.database_url)


@lru_cache(maxsize=1)
def get_session_factory() -> sessionmaker[Session]:
    """Create the reusable session factory."""

    return sessionmaker(bind=get_engine(), autoflush=False, autocommit=False, expire_on_commit=False)


def get_db_session() -> Generator[Session, None, None]:
    """Yield a request-scoped SQLAlchemy session."""

    session = get_session_factory()()
    try:
        yield session
    finally:
        session.close()
