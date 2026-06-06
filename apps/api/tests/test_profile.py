"""Profile endpoint + content loading."""

from __future__ import annotations

from httpx import AsyncClient

from server.content import load_resume


def test_resume_loads_and_validates() -> None:
    resume = load_resume()
    assert resume.basics.name
    assert resume.work, "expected at least one work entry in placeholder content"


async def test_get_profile(client: AsyncClient) -> None:
    res = await client.get("/profile")
    assert res.status_code == 200
    body = res.json()
    assert body["basics"]["name"]
    # camelCase aliases are emitted for the JS frontend.
    assert "work" in body
