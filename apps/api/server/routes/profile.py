"""/profile — serves the résumé single source of truth to the website."""

from __future__ import annotations

from fastapi import APIRouter

from server.content import load_resume
from server.schemas import Resume

router = APIRouter(tags=["profile"])


@router.get("/profile", response_model=Resume, response_model_by_alias=True)
async def get_profile() -> Resume:
    return load_resume()
