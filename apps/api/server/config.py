"""Application settings via pydantic-settings. All config (DB URL, upstream API
base URL + auth, CORS) comes from env — never hardcoded."""

from __future__ import annotations

from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Repo root = apps/api/server/config.py -> parents[3].
_REPO_ROOT = Path(__file__).resolve().parents[3]


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

    # Single source of truth for the résumé / profile (git-versioned).
    profile_path: Path = _REPO_ROOT / "content" / "profile.json"

    # "Ask my CV" assistant (Claude API). Key is config; never hardcoded.
    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-sonnet-4-6"

    # Live GitHub stats widget.
    github_username: str = "CalebSargeant"
    github_token: str | None = None  # optional; raises rate limits

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
