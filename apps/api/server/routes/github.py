"""/github/stats — live GitHub activity for the website widget."""

from __future__ import annotations

from typing import Any

import httpx
from fastapi import APIRouter, HTTPException

from services.github import fetch_github_stats

router = APIRouter(tags=["github"])


@router.get("/github/stats")
async def github_stats() -> dict[str, Any]:
    try:
        return await fetch_github_stats()
    except httpx.HTTPError as exc:  # upstream/network failure
        raise HTTPException(status_code=502, detail="Failed to reach GitHub") from exc
