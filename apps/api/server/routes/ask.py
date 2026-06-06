"""/ask — 'Ask my CV' assistant grounded in the résumé data."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from server.content import load_resume
from server.schemas import AskRequest, AskResponse
from services.assistant import AssistantUnavailable, ask_cv

router = APIRouter(tags=["assistant"])


@router.post("/ask", response_model=AskResponse)
async def ask(payload: AskRequest) -> AskResponse:
    try:
        answer = await ask_cv(payload.question, load_resume())
    except AssistantUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return AskResponse(answer=answer)
