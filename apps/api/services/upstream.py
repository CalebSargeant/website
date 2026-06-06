"""Server-to-server access to the Golden Stack platform API (single-backend mode).

The frontends never call upstream directly. When this product needs platform
data, the backend fetches it here with httpx and validates the response against
the SHARED `platform_schemas` Pydantic shape — never re-serving or
reimplementing the platform's endpoints.
"""

from __future__ import annotations

from uuid import UUID

import httpx
from platform_schemas import Item

from server.config import settings


def _client() -> httpx.AsyncClient:
    return httpx.AsyncClient(
        base_url=settings.platform_api_base_url,
        headers={"authorization": f"Bearer {settings.platform_api_token}"},
        timeout=10.0,
    )


async def fetch_item(item_id: UUID) -> Item:
    """Fetch a shared Item from upstream and validate it against the shared shape."""
    async with _client() as client:
        response = await client.get(f"/items/{item_id}")
        response.raise_for_status()
        return Item.model_validate(response.json())
