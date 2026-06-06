"""LOCAL Pydantic contract for this repo's NEW entities.

The product's single source of truth is the **résumé/profile** model below
(JSON Resume-aligned). Shared platform shapes are re-exported when referenced;
the import is guarded because the upstream `platform_schemas` package is not yet
published (see CLAUDE.md — sourcing is unresolved).
"""

from __future__ import annotations

from .resume import (
    Basics,
    Certificate,
    Education,
    Location,
    Profile,
    ProfileLink,
    Project,
    Resume,
    Skill,
    Work,
)

# Re-export the SHARED `Item` shape where referenced. Guarded so the local
# contract still imports while upstream sourcing is unresolved.
try:  # pragma: no cover - depends on unpublished upstream
    from platform_schemas import Item, ItemCreate
except ModuleNotFoundError:  # upstream not yet sourced
    Item = None  # type: ignore[assignment]
    ItemCreate = None  # type: ignore[assignment]

__all__ = [
    "Basics",
    "Certificate",
    "Education",
    "Item",
    "ItemCreate",
    "Location",
    "Profile",
    "ProfileLink",
    "Project",
    "Resume",
    "Skill",
    "Work",
]
