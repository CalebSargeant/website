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
