"""LOCAL Pydantic contract for this repo's NEW entities.

Mirrors the zod shapes in ``packages/schemas/src/index.ts`` (same dual-shape
pattern). Shared shapes are imported from ``platform_schemas`` and re-exported,
never redefined.
"""

# Re-export the SHARED `Item` shape so the foreign reference type isn't duplicated.
from platform_schemas import Item

from .widget import Widget, WidgetCreate

__all__ = ["Item", "Widget", "WidgetCreate"]
