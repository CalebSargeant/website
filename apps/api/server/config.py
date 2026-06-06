"""Application settings via pydantic-settings. All config (DB URL, upstream API
base URL + auth, CORS) comes from env — never hardcoded."""

from __future__ import annotations

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="APP_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = (
        "postgresql+psycopg://postgres:postgres@localhost:5432/website"
    )
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:8081"]

    # Upstream Golden Stack platform API (MagmaMoose/platform) — reached
    # server-to-server only.
    platform_api_base_url: str = "https://api.platform.example.com"
    platform_api_token: str = "replace-me"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_csv(cls, value: object) -> object:
        # Accept a comma-separated string from env as well as a JSON list.
        if isinstance(value, str) and not value.strip().startswith("["):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


settings = Settings()
