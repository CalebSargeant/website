"""API request/response schemas (the HTTP edge).

Domain shapes come from the local contract (`app_schemas`) — re-exported here so
routes never redefine them. Only thin request/response envelopes specific to an
endpoint live here.
"""

from __future__ import annotations

# Re-export the domain contract (single source of truth) for route handlers.
from app_schemas import Resume
from pydantic import BaseModel, Field

__all__ = ["Resume", "AskRequest", "AskResponse", "TailorRequest"]


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=500)


class AskResponse(BaseModel):
    answer: str


class TailorRequest(BaseModel):
    job_description: str = Field(min_length=20, max_length=20000)
