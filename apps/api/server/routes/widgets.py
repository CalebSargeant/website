"""/widgets routes — SQLAlchemy 2.0 (`select()` + `session.execute()`) only."""

from __future__ import annotations

from collections.abc import Sequence

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.session import get_session
from server.models.widget import Widget as WidgetORM
from server.schemas import Widget, WidgetCreate

router = APIRouter(prefix="/widgets", tags=["widgets"])


@router.get("", response_model=list[Widget])
async def list_widgets(
    session: AsyncSession = Depends(get_session),
) -> Sequence[WidgetORM]:
    result = await session.execute(
        select(WidgetORM).order_by(WidgetORM.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=Widget, status_code=status.HTTP_201_CREATED)
async def create_widget(
    payload: WidgetCreate,
    session: AsyncSession = Depends(get_session),
) -> WidgetORM:
    widget = WidgetORM(name=payload.name, item_id=payload.item_id)
    session.add(widget)
    await session.commit()
    await session.refresh(widget)
    return widget
