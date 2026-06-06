# Human command catalog. Turborepo is the orchestrator — these just call it (or uv).
# Not a build system: do not add task graph logic here.

default:
    @just --list

dev:
    turbo run dev

build:
    turbo run build

lint:
    turbo run lint

typecheck:
    turbo run typecheck

test:
    turbo run test

# Backend (Python is outside the JS task graph; uv runs it directly).
api-dev:
    cd apps/api && uv run uvicorn server.app:app --reload

api-test:
    cd apps/api && uv run pytest

api-migrate:
    cd apps/api && uv run alembic upgrade head
