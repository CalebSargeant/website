"""Loads + validates the résumé content (the single source of truth).

Reads ``content/profile.json`` and validates it against the local Pydantic
contract (`app_schemas.Resume`). Everything downstream — the API, the generated
CV, the LinkedIn sync — consumes the result of this one function, so the file is
genuinely the only place to edit.
"""

from __future__ import annotations

import json
from functools import lru_cache
from typing import Any

from app_schemas import Resume

from server.config import settings


def _blank_to_none(value: Any) -> Any:
    """Treat empty strings as absent (so optional URL/email fields validate)."""
    if isinstance(value, str):
        return value or None
    if isinstance(value, list):
        return [_blank_to_none(v) for v in value]
    if isinstance(value, dict):
        return {k: _blank_to_none(v) for k, v in value.items()}
    return value


@lru_cache(maxsize=1)
def load_resume() -> Resume:
    raw = json.loads(settings.profile_path.read_text(encoding="utf-8"))
    raw.pop("$note", None)  # strip the editor-facing note key
    return Resume.model_validate(_blank_to_none(raw))


def reload_resume() -> Resume:
    """Clear the cache and reload (after editing profile.json)."""
    load_resume.cache_clear()
    return load_resume()
