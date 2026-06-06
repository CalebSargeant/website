"""Résumé / profile contract — the product's single source of truth.

JSON Resume-aligned (https://jsonresume.org/schema) so the same data also works
with that ecosystem's themes and tooling. Pydantic v2; mirrors the zod shapes in
``packages/schemas/src/resume.ts`` field-for-field.
"""

from __future__ import annotations

from datetime import date

from pydantic import BaseModel, ConfigDict, EmailStr, Field, HttpUrl


class _Model(BaseModel):
    # Accept both JSON Resume camelCase (aliases) and snake_case; ignore extras.
    model_config = ConfigDict(populate_by_name=True, extra="ignore")


class Location(_Model):
    city: str | None = None
    region: str | None = None
    country_code: str | None = Field(default=None, alias="countryCode")


class ProfileLink(_Model):
    network: str
    username: str | None = None
    url: HttpUrl


class Basics(_Model):
    name: str
    label: str | None = None  # headline / current title
    email: EmailStr | None = None
    phone: str | None = None
    url: HttpUrl | None = None
    summary: str | None = None
    location: Location | None = None
    profiles: list[ProfileLink] = Field(default_factory=list)


class Work(_Model):
    name: str  # company
    position: str
    url: HttpUrl | None = None
    location: str | None = None
    start_date: str | None = Field(default=None, alias="startDate")
    end_date: str | None = Field(default=None, alias="endDate")
    summary: str | None = None
    highlights: list[str] = Field(default_factory=list)
    tech: list[str] = Field(default_factory=list)


class Education(_Model):
    institution: str
    area: str | None = None
    study_type: str | None = Field(default=None, alias="studyType")
    start_date: str | None = Field(default=None, alias="startDate")
    end_date: str | None = Field(default=None, alias="endDate")
    score: str | None = None
    courses: list[str] = Field(default_factory=list)


class Skill(_Model):
    name: str
    level: str | None = None
    keywords: list[str] = Field(default_factory=list)


class Project(_Model):
    name: str
    description: str | None = None
    url: HttpUrl | None = None
    highlights: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)


class Certificate(_Model):
    name: str
    date: str | None = None
    issuer: str | None = None
    url: HttpUrl | None = None


class Meta(_Model):
    last_updated: date | None = Field(default=None, alias="lastUpdated")
    version: str | None = None


class Resume(_Model):
    """Full résumé document — the canonical shape served + rendered + exported."""

    basics: Basics
    work: list[Work] = Field(default_factory=list)
    education: list[Education] = Field(default_factory=list)
    skills: list[Skill] = Field(default_factory=list)
    projects: list[Project] = Field(default_factory=list)
    certificates: list[Certificate] = Field(default_factory=list)
    meta: Meta | None = None


# `Profile` is an alias for the public-facing résumé document.
Profile = Resume
