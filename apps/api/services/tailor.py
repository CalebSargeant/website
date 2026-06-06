"""Tailor the résumé to a specific job description, then reuse the CV renderer.

This turns the single source of truth into infinitely many *targeted* CVs without
ever fabricating: Claude may reorder, re-emphasise, condense, and reword — but only
from facts already in ``profile.json``.
"""

from __future__ import annotations

import json

from anthropic import AsyncAnthropic
from app_schemas import Resume

from server.config import settings
from services.assistant import AssistantUnavailable

_SYSTEM = (
    "You tailor a résumé to a specific job description.\n"
    "STRICT RULES:\n"
    "- Use ONLY facts present in the provided résumé JSON. Never invent employers, "
    "dates, titles, education, skills, or achievements.\n"
    "- You MAY: reorder work/highlights/skills/projects by relevance to the job, "
    "reword the summary and bullet phrasing to emphasise relevant experience, and "
    "drop clearly irrelevant items.\n"
    "- Keep every company, title, and date exactly as given — factual and unchanged.\n"
    "- Preserve the JSON shape (JSON Resume: basics, work, education, skills, "
    "projects, certificates, meta).\n"
    "- Return ONLY the tailored résumé as JSON. No prose, no markdown, no code fences."
)


def _extract_json(text: str) -> dict:
    """Pull the JSON object out of a model response, tolerating stray prose/fences."""
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1 or end < start:
        raise ValueError("No JSON object found in tailoring response")
    return json.loads(text[start : end + 1])


async def tailor_resume(job_description: str, resume: Resume) -> Resume:
    if not settings.anthropic_api_key:
        raise AssistantUnavailable("ANTHROPIC API key is not configured")

    client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    resume_json = resume.model_dump_json(by_alias=True, exclude_none=True)

    message = await client.messages.create(
        model=settings.anthropic_model,
        max_tokens=4096,
        system=_SYSTEM,
        messages=[
            {
                "role": "user",
                "content": (
                    f"RÉSUMÉ JSON:\n{resume_json}\n\n"
                    f"JOB DESCRIPTION:\n{job_description}\n\n"
                    "Return the tailored résumé JSON."
                ),
            }
        ],
    )
    text = "".join(block.text for block in message.content if block.type == "text")
    # Coerce empty strings to null so optional URL/email fields validate.
    from server.content import _blank_to_none

    return Resume.model_validate(_blank_to_none(_extract_json(text)))
