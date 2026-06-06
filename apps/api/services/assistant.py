"""'Ask my CV' — answer visitor questions grounded in the résumé data.

A tiny RAG: the whole résumé (it's small) is passed as context to the Claude API,
with instructions to answer only from it. Keeps it accurate and on-brand.
"""

from __future__ import annotations

from anthropic import AsyncAnthropic
from app_schemas import Resume

from server.config import settings

_SYSTEM = (
    "You are an assistant on {name}'s personal website. Answer visitor questions "
    "about {name}'s career, skills, and experience using ONLY the résumé JSON "
    "provided. Be concise, friendly, and first-person plural about the work where "
    "natural. If the answer isn't in the résumé, say you don't have that detail and "
    "suggest contacting {name} directly. Never invent facts."
)


class AssistantUnavailable(RuntimeError):
    """Raised when no Anthropic API key is configured."""


async def ask_cv(question: str, resume: Resume) -> str:
    if not settings.anthropic_api_key:
        raise AssistantUnavailable("ANTHROPIC API key is not configured")

    client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    resume_json = resume.model_dump_json(by_alias=True, exclude_none=True)

    message = await client.messages.create(
        model=settings.anthropic_model,
        max_tokens=600,
        system=_SYSTEM.format(name=resume.basics.name),
        messages=[
            {
                "role": "user",
                "content": f"Résumé JSON:\n{resume_json}\n\nVisitor question: {question}",
            }
        ],
    )
    return "".join(block.text for block in message.content if block.type == "text")
