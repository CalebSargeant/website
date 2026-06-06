"""Shared helpers for the LinkedIn tools — load/save the single source of truth."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
PROFILE_PATH = REPO_ROOT / "content" / "profile.json"


def load_profile() -> dict[str, Any]:
    return json.loads(PROFILE_PATH.read_text(encoding="utf-8"))


def save_profile(data: dict[str, Any]) -> None:
    PROFILE_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def headline(profile: dict[str, Any]) -> str:
    basics = profile.get("basics", {})
    return basics.get("label") or basics.get("name", "")


def about(profile: dict[str, Any]) -> str:
    return profile.get("basics", {}).get("summary", "")


def experience_blocks(profile: dict[str, Any]) -> list[str]:
    blocks: list[str] = []
    for w in profile.get("work", []):
        lines = [f"{w.get('position', '')} — {w.get('name', '')}"]
        rng = f"{w.get('startDate', '')} – {w.get('endDate') or 'Present'}".strip(" –")
        if rng:
            lines.append(rng)
        if w.get("summary"):
            lines.append(w["summary"])
        lines += [f"• {h}" for h in w.get("highlights", [])]
        if w.get("tech"):
            lines.append("Skills: " + ", ".join(w["tech"]))
        blocks.append("\n".join(lines))
    return blocks
