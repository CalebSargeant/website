# Architecture — Golden Stack Consumer (calebsargeant.com)

A self-contained full-stack product that **consumes** the Golden Stack building blocks
from `MagmaMoose/platform` and **builds** its own backend + contract + API client.

```
apps/web  ─┐                         ┌─ packages/schemas  (NEW shapes: Widget; re-exports shared Item)
apps/mobile┼─ packages/api-client ──►├─ apps/api (FastAPI, own DB + routes)
           │  (one client, one URL)   └─ services/upstream.py ──► MagmaMoose/platform API (httpx, server-to-server)
           └─ @platform/ui (web only)
```

## The vertical slice (this session)

A **new** local entity `Widget` (`id`, `name`, `item_id` → shared `Item`, `created_at`):

1. **`packages/schemas`** — zod `Widget`/`WidgetCreate` + Pydantic `Widget`/`WidgetCreate`,
   each re-exporting the shared `Item` from `@platform/schemas` / `platform_schemas`.
2. **`apps/api`** — `GET`/`POST /widgets` (SQLAlchemy 2.0 async + psycopg 3), Pydantic v2
   importing the shared `Item`, one Alembic migration (`0001_create_widgets`), one pytest test.
3. **`packages/api-client`** — typed client + TanStack Query hooks against this repo's API.
4. **`apps/web`** — one screen (lists/creates widgets) via the local hook + `@platform/ui`.
5. **`apps/mobile`** — the same screen via the **same** hook, UI from RN primitives + NativeWind.

## Decisions

- **Upstream-API mode: single backend (default).** Frontends use one base URL; the backend
  reaches `MagmaMoose/platform` server-to-server and validates against `platform_schemas`.
- **Two-layer contract:** shared shapes consumed (never redefined); new shapes defined once
  in `packages/schemas`; nothing inlined in an app/service.

## Known open items (need a decision)

- **Upstream sourcing.** Every `@platform/*` package and `platform_schemas` is `private: true`
  / `0.0.0` and **unpublished**. `pnpm install` / `uv sync` cannot resolve them yet. Pick a
  distribution path (GitHub Packages registry, git dependency, or submodule) before the slice
  can build/run end-to-end.
- **Tooling gaps upstream.** `@platform/config` ships tsconfig + prettier + vitest but **no
  eslint / tailwind** preset, so `packages/config` adds those locally (clearly marked).
- **Site mimicry.** The product is themed for calebsargeant.com but does not yet reproduce the
  live site's content/design — scope TBD.
