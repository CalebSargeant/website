"""/cv — generate the CV on the fly from the same résumé data."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Response
from fastapi.responses import JSONResponse

from server.content import load_resume
from services.cv import render_cv_json, render_cv_pdf

router = APIRouter(tags=["cv"])


@router.get("/cv")
async def generate_cv(format: Literal["pdf", "json"] = "pdf") -> Response:
    resume = load_resume()
    if format == "json":
        # JSON Resume-compatible export (works with the jsonresume.org ecosystem).
        return JSONResponse(content=render_cv_json(resume))

    pdf = render_cv_pdf(resume)
    filename = f"{resume.basics.name.replace(' ', '_')}_CV.pdf"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
