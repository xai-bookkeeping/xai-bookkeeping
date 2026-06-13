from collections.abc import AsyncGenerator
from functools import lru_cache

from fastapi import Depends
from sqlalchemy.engine import URL
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import Settings
from app.core.config import get_settings


def _replace_driver(database_url: str, drivername: str) -> str:
    url = make_url(database_url)
    return url.set(drivername=drivername).render_as_string(hide_password=False)


def normalize_sync_database_url(database_url: str) -> str:
    """Return a driver URL compatible with synchronous SQLAlchemy operations."""

    url: URL = make_url(database_url)
    if url.drivername == "postgresql+asyncpg":
        return _replace_driver(database_url, "postgresql+psycopg")
    return database_url


def normalize_async_database_url(database_url: str) -> str:
    """Return a driver URL compatible with async SQLAlchemy operations."""

    url: URL = make_url(database_url)
    if url.drivername == "postgresql+psycopg":
        return _replace_driver(database_url, "postgresql+asyncpg")
    return database_url


def build_engine(database_url: str) -> Engine:
    """Build a SQLAlchemy engine for the configured PostgreSQL URL."""

    return create_engine(normalize_sync_database_url(database_url), pool_pre_ping=True)


def build_async_engine(database_url: str) -> AsyncEngine:
    """Build an async SQLAlchemy engine for request-scoped DB access."""

    return create_async_engine(normalize_async_database_url(database_url), pool_pre_ping=True)


@lru_cache(maxsize=8)
def get_engine(database_url: str) -> Engine:
    """Return a cached engine for the provided database URL."""

    return build_engine(database_url)


@lru_cache(maxsize=8)
def get_session_factory(database_url: str) -> sessionmaker:
    """Create the reusable synchronous session factory."""

    return sessionmaker(
        bind=get_engine(database_url),
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
    )


@lru_cache(maxsize=8)
def get_async_engine(database_url: str) -> AsyncEngine:
    """Return a cached async engine for the provided database URL."""

    return build_async_engine(database_url)


@lru_cache(maxsize=8)
def get_async_session_factory(database_url: str) -> async_sessionmaker[AsyncSession]:
    """Create the reusable async session factory."""

    return async_sessionmaker(
        bind=get_async_engine(database_url),
        autoflush=False,
        expire_on_commit=False,
    )


async def dispose_async_session_resources(database_url: str) -> None:
    """Dispose cached async engine/session resources for a database URL."""

    engine = get_async_engine(database_url)
    await engine.dispose()
    get_async_session_factory.cache_clear()
    get_async_engine.cache_clear()


async def get_db_session(
    settings: Settings = Depends(get_settings),
) -> AsyncGenerator[AsyncSession, None]:
    """Yield a request-scoped async SQLAlchemy session."""

    if settings.database_url is None:
        raise RuntimeError("DATABASE_URL is required for the backend database session")

    async with get_async_session_factory(settings.database_url)() as session:
        yield session
