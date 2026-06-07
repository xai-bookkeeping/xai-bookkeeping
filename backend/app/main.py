from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import Settings, get_settings
from app.db.session import dispose_async_session_resources


@asynccontextmanager
async def app_lifespan(settings: Settings) -> AsyncIterator[None]:
    yield
    if settings.database_url is not None:
        await dispose_async_session_resources(settings.database_url)


def create_app(settings: Settings | None = None) -> FastAPI:
    resolved_settings = settings or get_settings()
    app = FastAPI(
        title=resolved_settings.app_name,
        version=resolved_settings.app_version,
        lifespan=lambda _: app_lifespan(resolved_settings),
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(resolved_settings.cors_allowed_origins),
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.state.settings = resolved_settings
    app.dependency_overrides[get_settings] = lambda: resolved_settings
    app.include_router(api_router)
    return app


app = create_app()
