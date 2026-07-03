"""Application configuration.

Loads settings from environment variables (and a local .env file, if
present) using Pydantic Settings. A single cached ``Settings`` instance is
exposed via :func:`get_settings` so the rest of the application never reads
environment variables directly.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Strongly typed application settings.

    Values are loaded from environment variables. See ``.env.example`` for
    the full list of supported variables.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    APP_NAME: str = "Lucky Insight API"
    APP_ENV: str = "development"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    DEBUG: bool = False

    DATABASE_URL: str

    JWT_SECRET_KEY: str
    JWT_REFRESH_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    LOG_LEVEL: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    """Return a cached, singleton ``Settings`` instance."""
    return Settings()
