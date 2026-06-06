"""SQLAlchemy 2.0 declarative base. 2.0 style only — no legacy declarative_base()."""

from __future__ import annotations

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
