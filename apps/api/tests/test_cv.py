"""CV generation — the core 'single source of truth -> CV' guarantee."""

from __future__ import annotations

from httpx import AsyncClient

from server.content import load_resume
from services.cv import render_cv_pdf


def test_render_cv_pdf_bytes() -> None:
    pdf = render_cv_pdf(load_resume())
    assert pdf.startswith(b"%PDF"), "output should be a real PDF"
    assert len(pdf) > 1000


async def test_cv_pdf_endpoint(client: AsyncClient) -> None:
    res = await client.get("/cv?format=pdf")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert res.content.startswith(b"%PDF")


async def test_cv_json_endpoint(client: AsyncClient) -> None:
    res = await client.get("/cv?format=json")
    assert res.status_code == 200
    body = res.json()
    assert body["basics"]["name"]


def test_extract_json_tolerates_prose_and_fences() -> None:
    from services.tailor import _extract_json

    raw = 'Here is the tailored résumé:\n```json\n{"basics": {"name": "X"}}\n```\nDone.'
    assert _extract_json(raw) == {"basics": {"name": "X"}}


async def test_tailor_requires_api_key(client: AsyncClient) -> None:
    # No ANTHROPIC key configured in tests -> graceful 503, not a crash.
    res = await client.post("/cv/tailor", json={"job_description": "x" * 40})
    assert res.status_code == 503
