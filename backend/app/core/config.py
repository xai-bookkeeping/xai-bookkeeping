from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Typed environment settings for the backend application."""

    model_config = SettingsConfigDict(env_prefix="", extra="ignore")

    app_name: str = "XAI Books API"
    app_version: str = "0.1.0"
    environment: str = "development"
    database_url: str | None = None
    clerk_publishable_key: str | None = None
    clerk_secret_key: str | None = None
    clerk_jwt_key: str | None = None
    clerk_webhook_signing_secret: str | None = None
    clerk_authorized_parties: tuple[str, ...] = ()
    cors_allowed_origins: tuple[str, ...] = (
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Load settings once per process."""

    return Settings()
