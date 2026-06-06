# Architecture — calebsargeant.com

A self-contained full-stack product that **consumes** the Golden Stack building blocks
from `MagmaMoose/platform` and **builds** its own backend, contract, and clients on top.
The site is the **single source of truth**: `content/profile.json` drives the rendered
site, the generated CV, and the LinkedIn sync.

```
content/profile.json  ──►  apps/api (FastAPI)  ──►  GET /profile   (drives the site)
   (the SSOT)                                  ──►  GET /cv         (PDF / JSON Resume, generated live)
                                               ──►  GET /github/stats
                                               ──►  POST /ask       (Ask-my-CV, Claude API)
apps/web / apps/mobile  ──►  packages/api-client (one client, one base URL)
tools/linkedin/*        ──►  keep LinkedIn in step with profile.json
```

## Single source of truth

- **`content/profile.json`** — JSON Resume-aligned résumé you edit. Validated on load
  against the local Pydantic contract.
- **`packages/schemas`** — `Resume`/`Basics`/`Work`/`Education`/`Skill`/`Project`/
  `Certificate` shapes (zod + Pydantic), mirrored field-for-field. Still re-exports the
  shared `Item` from `@platform/schemas` for the two-layer pattern.

## CV generation

`apps/api` `GET /cv?format=pdf|json` builds the CV on the fly from `profile.json`:
- **PDF** via `reportlab` (pure-Python — no system libraries, runs in any container).
- **JSON** is JSON Resume-compatible, so the same data works with that theme ecosystem.
Edit the JSON → the site, the PDF, and the LinkedIn text all update. No stale artifact.

## Wow factor

- **Ask my CV** (`POST /ask`) — a tiny RAG: the whole résumé is sent to the Claude API
  with instructions to answer only from it. Needs `APP_ANTHROPIC_API_KEY`.
- **Live GitHub stats** (`GET /github/stats`) — repos/stars/followers/top languages.
- **3D career timeline** — `react-three-fiber` hero on the web app (drag to orbit).

## LinkedIn sync (see tools/linkedin/README.md)

There is **no supported API** for an individual to programmatically edit their own
profile positions (the Profile Edit API is a gated Partner program). So:
- `generate_sections.py` — copy-paste-ready Headline/About/Experience (ToS-safe). **Recommended.**
- `import_linkedin_export.py` — seed `profile.json` from your LinkedIn data export (ToS-safe).
- `push_playwright.py` — opt-in browser automation for Headline+About (**against LinkedIn ToS**, off by default).

## Known open items

- **Upstream sourcing.** Every `@platform/*` package is `private:true` / `0.0.0` and
  unpublished, so the **JS workspace** (`pnpm install`) can't resolve them yet. The
  **Python backend** (profile + CV + GitHub + Ask-my-CV) is decoupled from the unpublished
  upstream and **runs + tests green today**.
- The `apps/api` Postgres/Alembic scaffold is retained for future persistent entities; the
  résumé product itself is intentionally file-based.
