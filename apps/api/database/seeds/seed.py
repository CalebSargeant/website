"""Dev seed — inserts a couple of widgets. Run: `uv run python -m database.seeds.seed`."""

from __future__ import annotations

import asyncio
import uuid

from database.session import SessionLocal
from server.models.widget import Widget


async def seed() -> None:
    async with SessionLocal() as session:
        session.add_all(
            [
                Widget(name="First widget", item_id=uuid.uuid4()),
                Widget(name="Second widget", item_id=uuid.uuid4()),
            ]
        )
        await session.commit()


if __name__ == "__main__":
    asyncio.run(seed())
