"""Widget — a NEW entity owned by this repo (Pydantic v2 side of the contract)."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

# Imported only to assert the foreign reference resolves against the shared shape.
from platform_schemas import Item  # noqa: F401  (referenced for type parity)


class WidgetCreate(BaseModel):
    """Payload for creating a Widget. Server assigns ``id`` + ``created_at``."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=200)
    item_id: UUID  # foreign reference to the shared Item


class Widget(WidgetCreate):
    """A persisted Widget. Matches WidgetSchema (zod) field-for-field."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: UUID
    created_at: datetime
