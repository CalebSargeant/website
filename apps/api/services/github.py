"""Live GitHub stats for the website 'wow factor' widget.

Reads public data via the GitHub REST API (httpx). A token is optional and only
raises the rate limit — never hardcoded.
"""

from __future__ import annotations

from typing import Any

import httpx

from server.config import settings

_API = "https://api.github.com"


def _headers() -> dict[str, str]:
    headers = {"Accept": "application/vnd.github+json"}
    if settings.github_token:
        headers["Authorization"] = f"Bearer {settings.github_token}"
    return headers


async def fetch_github_stats() -> dict[str, Any]:
    user = settings.github_username
    async with httpx.AsyncClient(base_url=_API, headers=_headers(), timeout=10.0) as client:
        profile = (await client.get(f"/users/{user}")).raise_for_status().json()
        repos = (
            await client.get(
                f"/users/{user}/repos",
                params={"per_page": 100, "sort": "pushed", "type": "owner"},
            )
        ).raise_for_status().json()

    public_repos = [r for r in repos if not r.get("fork")]
    total_stars = sum(r.get("stargazers_count", 0) for r in public_repos)
    languages: dict[str, int] = {}
    for r in public_repos:
        lang = r.get("language")
        if lang:
            languages[lang] = languages.get(lang, 0) + 1
    top_languages = [
        {"name": name, "count": count}
        for name, count in sorted(languages.items(), key=lambda kv: kv[1], reverse=True)[:5]
    ]
    latest = public_repos[0] if public_repos else None

    return {
        "login": profile.get("login"),
        "name": profile.get("name"),
        "followers": profile.get("followers", 0),
        "public_repos": profile.get("public_repos", 0),
        "total_stars": total_stars,
        "top_languages": top_languages,
        "latest_repo": (
            {
                "name": latest.get("name"),
                "url": latest.get("html_url"),
                "description": latest.get("description"),
                "pushed_at": latest.get("pushed_at"),
            }
            if latest
            else None
        ),
    }
