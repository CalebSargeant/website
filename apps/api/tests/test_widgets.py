"""One pytest test for the /widgets vertical slice."""

from __future__ import annotations

import uuid

from httpx import AsyncClient


async def test_create_and_list_widget(client: AsyncClient) -> None:
    item_id = str(uuid.uuid4())

    created = await client.post("/widgets", json={"name": "Test widget", "item_id": item_id})
    assert created.status_code == 201
    body = created.json()
    assert body["name"] == "Test widget"
    assert body["item_id"] == item_id
    assert body["id"]
    assert body["created_at"]

    listed = await client.get("/widgets")
    assert listed.status_code == 200
    widgets = listed.json()
    assert len(widgets) == 1
    assert widgets[0]["id"] == body["id"]
