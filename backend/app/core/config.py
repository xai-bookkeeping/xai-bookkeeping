from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Typed environment settings for the backend application."""

    model_config = SettingsConfigDict(env_prefix="", extra="ignore")

    app_name: str = "XAI Books API"
    app_version: str = "0.1.0"
    environment: str = "development"
    database_url: str | None = None


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Load settings once per process."""

    return Settings()
