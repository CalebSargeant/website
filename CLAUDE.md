# calebsargeant.com

Caleb's personal site and CV (www.calebsargeant.com). `data/*.yml` is the single source of truth; `scripts/build.py` renders it with Jinja2 into `dist/`, which ships as Cloudflare Workers static assets. The same data renders three A4 print sheets that Playwright prints to the CV, JDs & Duties and cover-letter PDFs. No framework, no bundler: one site stylesheet, one print stylesheet, progressive-enhancement JS only.

**This file (`CLAUDE.md`) is canonical.** `AGENTS.md` mirrors it for other agents. Edit both together.

@.claude/QUICK_START.md

@.claude/COMMON_MISTAKES.md

**Two documents are contracts, not notes. Read the relevant one before touching CSS, JS or a template:**
- `docs/design-system.md`: tokens, the exact class names / ids / data-attributes shared by `assets/site.css`, `assets/site.js`, `assets/hero-net.js` and `templates/`, the animation catalogue, the print rules, and the accessibility floor in section 6. A name there is the name everywhere; changing it in one place breaks the other two.
- `docs/template-context.md`: every variable `build.py` hands a template, the enriched role fields, and the `base.html` block contract.

**Content is never edited in a template or in `dist/`.** A fact about Caleb lives in `data/profile.yml`, `experience.yml`, `education.yml`, `courses.yml` or `skills.yml` and nowhere else. `dist/` is deleted on every build. The README's "Change something" table maps a task to the one file it touches.

Voice: plain, senior engineer, understated. British spelling. No em-dashes in copy (comma, full stop or brackets). No marketing words.

Before locating unfamiliar code, read `./PROJECT_INDEX.json`.

[tooling]
- Prefer targeted line-range reads over whole files; use PROJECT_INDEX.json to find the location.
- grep/find/glob: return matching paths and matched lines only, never whole-file dumps.
- Commands that can flood output (`make build`, `wrangler deploy`): pipe through head/tail/grep, or redirect to `.claude/last_output.txt` and read ranges.
- After a successful write or edit, trust it. Don't re-read the file to "verify" it.

[maintenance]
- Bug that took more than an hour: append it to `.claude/COMMON_MISTAKES.md`.
- Architectural decision: write it to `.claude/decisions/` (run /adr).
- Public behaviour, config or setup changed: update `README.md`, and `docs/design-system.md` or `docs/template-context.md` if the change touched a contract. There is no published `./docs` site to sync.
- PROJECT_INDEX.json stale after a new page, template, script or big refactor: regenerate the affected modules section only, and update `generated`.
- Keep this file under ~500 tokens. Push detail into on-demand `.claude/` files.
