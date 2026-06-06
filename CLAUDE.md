# Golden Stack Consumer (calebsargeant.com) — Conventions

This is a **standalone** full-stack product (web + mobile + its **own** FastAPI) that
**reuses the Golden Stack's building blocks** from **`MagmaMoose/platform`** (and
`MagmaMoose/platform-pro`). It is **not** part of that monorepo. When something here
conflicts with a more common default, **this document wins**.

## Two-layer contract discipline (the rule that matters most)

- **Shared shapes** (owned by the platform) → consume `@platform/schemas` (zod) and
  `platform_schemas` (Pydantic). **Never redefine them.** Upstream names the zod schema
  `Item` (value + type) with `ItemCreate`; the Pydantic class is `Item`/`ItemCreate`.
- **New shapes** (owned by this repo) → define once in `packages/schemas` (zod +
  Pydantic). **Never inline a shape in an app or service.** Re-export shared shapes
  where referenced so the foreign type isn't duplicated.

## Consumed, read-only upstream — `MagmaMoose/platform`

| Package | What | Notes |
| --- | --- | --- |
| `@platform/config` | tsconfig + prettier + vitest presets | **No eslint / tailwind preset upstream** |
| `@platform/ui` | shared **web** components (shadcn) | Web only — does NOT port to RN |
| `@platform/schemas` | shared contract (zod) | `Item`, `ItemCreate` |
| `platform_schemas` | shared contract (Pydantic) | `Item`, `ItemCreate` |
| `@platform/api-client` | typed client + TanStack hooks | only in **direct** upstream mode |

> ⚠️ **Sourcing is unresolved.** Every `@platform/*` package is `private: true` /
> version `0.0.0` and is **not published to any registry**. The pins below are the
> intended versions; `pnpm install` / `uv sync` will not resolve them until we decide
> how to consume the upstream (publish to GitHub Packages, git dependency, or
> submodule). Do **not** vendor or fork — see "Upgrade upstream deliberately".

Need a new field/component upstream? Propose it on `MagmaMoose/platform` (issue/PR),
then bump the pinned version here. Never patch `node_modules`/`site-packages` or vendor
a fork. Temporary only: `pnpm patch` + `// TODO: upstream this` + issue link.

## Local additions where upstream has no preset

`@platform/config` ships **no eslint and no tailwind** preset. So `packages/config`
adds a **local** ESLint flat config and a **local** Tailwind preset (clearly marked),
while re-exporting upstream's `tsconfig.base.json`, `prettier`, and `vitest`. If
upstream later adds these, switch to consuming them.

## Upstream platform API mode — DECISION: single backend (default)

Frontends call **only** this repo's API (one base URL, one client). When the product
needs platform data, the **backend** calls upstream server-to-server with `httpx`,
validates against `platform_schemas`, and re-exposes through our own routes. See
`apps/api/services/upstream.py`. Do **not** reimplement or re-serve platform endpoints.

## Hard rules

- SQLAlchemy **2.0 style only** (`select()` + `session.execute()`); never `session.query`.
- Pydantic **v2 only** (`@field_validator`, `model_config`); never v1 `@validator`/`Config`.
- Python deps: **uv only**. Lint/format: **Ruff only**. No pip/poetry/black/flake8/isort.
- JS deps: **pnpm workspaces only**. Task orchestration: **Turborepo only**.
- Runtime versions pinned in `mise.toml`; exact dep versions in `package.json` / `pyproject.toml`.
- Backend is **client-agnostic** — web and mobile share the same API; do not fork per client.
- API base URL(s) + auth are **configuration** (`VITE_*`, `EXPO_PUBLIC_*`, pydantic-settings).
- Web UI != mobile UI — share types/schemas/api-client/query hooks, never visual components.

## Pinned versions (this slice)

| Thing | Version |
| --- | --- |
| Node | 22.12.0 |
| Python | 3.12.8 |
| pnpm | 9.15.0 |
| uv | 0.5.11 |
| Expo SDK | 52.0.0 |
| React Native | 0.76.5 |
| React | 18.3.1 |
| SQLAlchemy | 2.0.36 |
| Pydantic | 2.10.4 |
| FastAPI | 0.115.6 |
| zod | 3.24.1 |
| `@platform/config` | 0.0.0 *(unpublished — sourcing TBD)* |
| `@platform/ui` | 0.0.0 *(unpublished)* |
| `@platform/schemas` | 0.0.0 *(unpublished)* |
| `@platform/api-client` | 0.0.0 *(unpublished — direct mode only)* |
| `platform_schemas` | 0.0.0 *(unpublished — Python)* |
