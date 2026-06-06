"""/cv — generate the CV on the fly from the same résumé data."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import JSONResponse

from server.content import load_resume
from server.schemas import TailorRequest
from services.assistant import AssistantUnavailable
from services.cv import render_cv_json, render_cv_pdf
from services.tailor import tailor_resume

router = APIRouter(tags=["cv"])


def _pdf_response(resume, suffix: str = "") -> Response:
    pdf = render_cv_pdf(resume)
    filename = f"{resume.basics.name.replace(' ', '_')}_CV{suffix}.pdf"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/cv")
async def generate_cv(format: Literal["pdf", "json"] = "pdf") -> Response:
    resume = load_resume()
    if format == "json":
        # JSON Resume-compatible export (works with the jsonresume.org ecosystem).
        return JSONResponse(content=render_cv_json(resume))
    return _pdf_response(resume)


@router.post("/cv/tailor")
async def tailor_cv(
    payload: TailorRequest,
    format: Literal["pdf", "json"] = "pdf",
) -> Response:
    """Reorder/reword the résumé for a specific job description, then render it."""
    try:
        tailored = await tailor_resume(payload.job_description, load_resume())
    except AssistantUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    if format == "json":
        return JSONResponse(content=render_cv_json(tailored))
    return _pdf_response(tailored, suffix="_tailored")
