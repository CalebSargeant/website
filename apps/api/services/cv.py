"""Generate a CV from the résumé single source of truth.

Pure-Python (reportlab) so it runs in any container with no system libraries.
The same `Resume` data drives the website, this PDF, and the LinkedIn sync — edit
``content/profile.json`` and every output updates.
"""

from __future__ import annotations

import io

from app_schemas import Resume
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Flowable,
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
)

_ACCENT = HexColor("#6366f1")
_INK = HexColor("#0f172a")
_MUTED = HexColor("#64748b")


def _styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "name": ParagraphStyle(
            "name", parent=base["Title"], fontSize=22, textColor=_INK,
            spaceAfter=2, leading=24,
        ),
        "label": ParagraphStyle(
            "label", parent=base["Normal"], fontSize=11, textColor=_ACCENT,
            spaceAfter=6,
        ),
        "contact": ParagraphStyle(
            "contact", parent=base["Normal"], fontSize=9, textColor=_MUTED,
            spaceAfter=2,
        ),
        "summary": ParagraphStyle(
            "summary", parent=base["Normal"], fontSize=10, textColor=_INK,
            leading=14, spaceBefore=6, spaceAfter=4,
        ),
        "section": ParagraphStyle(
            "section", parent=base["Heading2"], fontSize=12, textColor=_INK,
            spaceBefore=12, spaceAfter=2, alignment=TA_LEFT,
        ),
        "role": ParagraphStyle(
            "role", parent=base["Normal"], fontSize=10.5, textColor=_INK,
            spaceBefore=6, leading=13,
        ),
        "meta": ParagraphStyle(
            "meta", parent=base["Normal"], fontSize=9, textColor=_MUTED,
            spaceAfter=2,
        ),
        "bullet": ParagraphStyle(
            "bullet", parent=base["Normal"], fontSize=9.5, textColor=_INK,
            leftIndent=10, leading=13, bulletIndent=0,
        ),
        "tags": ParagraphStyle(
            "tags", parent=base["Normal"], fontSize=8.5, textColor=_MUTED,
            spaceBefore=2, spaceAfter=2,
        ),
    }


def _date_range(start: str | None, end: str | None) -> str:
    if not start and not end:
        return ""
    return f"{start or ''} – {end or 'Present'}"


def _section_header(text: str, styles: dict[str, ParagraphStyle]) -> list[Flowable]:
    return [
        Paragraph(text.upper(), styles["section"]),
        HRFlowable(width="100%", thickness=0.6, color=_ACCENT, spaceAfter=4),
    ]


def render_cv_pdf(resume: Resume) -> bytes:
    styles = _styles()
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm,
        topMargin=16 * mm, bottomMargin=16 * mm,
        title=f"{resume.basics.name} — CV",
        author=resume.basics.name,
    )
    story: list[Flowable] = []
    b = resume.basics

    story.append(Paragraph(b.name, styles["name"]))
    if b.label:
        story.append(Paragraph(b.label, styles["label"]))

    contact_bits = [str(x) for x in (b.email, b.phone, b.url) if x]
    if b.location and (b.location.city or b.location.region):
        contact_bits.append(", ".join(filter(None, [b.location.city, b.location.region])))
    contact_bits += [str(p.url) for p in b.profiles]
    if contact_bits:
        story.append(Paragraph("  •  ".join(contact_bits), styles["contact"]))

    if b.summary:
        story.append(Paragraph(b.summary, styles["summary"]))

    if resume.work:
        story += _section_header("Experience", styles)
        for w in resume.work:
            story.append(Paragraph(f"<b>{w.position}</b> — {w.name}", styles["role"]))
            meta = "  •  ".join(filter(None, [_date_range(w.start_date, w.end_date), w.location]))
            if meta:
                story.append(Paragraph(meta, styles["meta"]))
            if w.summary:
                story.append(Paragraph(w.summary, styles["bullet"]))
            for h in w.highlights:
                story.append(Paragraph(h, styles["bullet"], bulletText="•"))
            if w.tech:
                story.append(Paragraph(f"<i>{' · '.join(w.tech)}</i>", styles["tags"]))

    if resume.projects:
        story += _section_header("Projects", styles)
        for p in resume.projects:
            story.append(Paragraph(f"<b>{p.name}</b>", styles["role"]))
            if p.description:
                story.append(Paragraph(p.description, styles["bullet"]))
            for h in p.highlights:
                story.append(Paragraph(h, styles["bullet"], bulletText="•"))
            if p.keywords:
                story.append(Paragraph(f"<i>{' · '.join(p.keywords)}</i>", styles["tags"]))

    if resume.skills:
        story += _section_header("Skills", styles)
        for s in resume.skills:
            kw = f": {', '.join(s.keywords)}" if s.keywords else ""
            story.append(Paragraph(f"<b>{s.name}</b>{kw}", styles["bullet"]))

    if resume.education:
        story += _section_header("Education", styles)
        for e in resume.education:
            degree = f"{e.study_type or ''} {e.area or ''}".strip()
            line = " — ".join(filter(None, [degree, e.institution]))
            story.append(Paragraph(f"<b>{line}</b>", styles["role"]))
            rng = _date_range(e.start_date, e.end_date)
            if rng:
                story.append(Paragraph(rng, styles["meta"]))

    if resume.certificates:
        story += _section_header("Certifications", styles)
        for c in resume.certificates:
            bits = "  •  ".join(filter(None, [c.name, c.issuer, c.date]))
            story.append(Paragraph(bits, styles["bullet"]))

    doc.build(story)
    return buf.getvalue()


def render_cv_json(resume: Resume) -> dict:
    """JSON Resume-compatible export (camelCase aliases)."""
    return resume.model_dump(by_alias=True, exclude_none=True, mode="json")
