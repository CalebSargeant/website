"""API request/response schemas.

Two-layer contract in action:
  * SHARED `Item` shape is imported (never redefined) from the local Pydantic
    contract, which itself re-exports it from `platform_schemas`.
  * NEW `Widget` / `WidgetCreate` shapes come from the local contract too.
Nothing is inlined here.
"""

from app_schemas import Item, Widget, WidgetCreate

__all__ = ["Item", "Widget", "WidgetCreate"]
