# AGENTS.md

`CLAUDE.md` is the canonical agent file for this repo. This mirror carries the same essentials for agents that read `AGENTS.md` instead. **Edit the two together**, there is no import mechanism here, so this file restates rather than references.

Caleb Sargeant's personal site and CV (www.calebsargeant.com). `data/*.yml` is the single source of truth; `scripts/build.py` renders it with Jinja2 into `dist/`, which ships as Cloudflare Workers static assets. The same data renders three A4 print sheets that Playwright prints to the CV, JDs & Duties and cover-letter PDFs. No framework, no bundler: one site stylesheet (`assets/site.css`), one print stylesheet (`assets/print.css`), progressive-enhancement JS only (`assets/site.js`, `assets/hero-net.js`).

**Before you start:**
- Read `docs/design-system.md` if you are touching CSS, JS or markup. It is the contract: tokens, the exact class names / ids / data-attributes shared by the stylesheet, the scripts and the templates, the animation catalogue, the print rules, and the accessibility floor in section 6. A name there is the name in all three places.
- Read `docs/template-context.md` if you are touching a template. It lists every variable `build.py` provides, the enriched role fields, and the blocks `base.html` expects a child to override.
- Read `./PROJECT_INDEX.json` to locate code before searching.
- Read `.claude/COMMON_MISTAKES.md` for the footguns and `.claude/QUICK_START.md` for the commands.

**Content is never edited in a template or in `dist/`.** A fact about Caleb lives in `data/profile.yml`, `experience.yml`, `education.yml`, `courses.yml` or `skills.yml` and nowhere else. `dist/` is deleted and rewritten on every build. The README's "Change something" table maps a task to the one file it touches.

**Commands** (no test suite; Python 3, `make` is the front door):
- `make install`: pip install `requirements.txt`, then Playwright's Chromium (a separate download).
- `make build`: render `data/` + `templates/` into `dist/`. No Chromium needed.
- `make pdf`: build, then print the three PDFs into `dist/downloads/`.
- `make serve`: build with PDFs, then serve `dist/` on http://127.0.0.1:8788/.
- `make clean`: delete `dist/`.
- `python3 scripts/render_pdf.py --check`: assert the PDFs exist, are PDFs and are not empty.
- `make build && npx wrangler dev`: the only local check that applies `_headers` and the real 404.
- Deploy is CI-only: `wrangler deploy` on `main`, `wrangler versions upload` on a PR.

**Watch out for** (full list in `.claude/COMMON_MISTAKES.md`): Jinja runs with `StrictUndefined`, so a template typo fails the build rather than rendering blank; editing a page in `dist/` does nothing; the PDFs need `document.fonts.ready` and a real HTTP origin, never `file://`; adding highlights or duties in `data/experience.yml` can silently overflow the A4 CV sheet; a colour defined only inside a theme block breaks the other theme; `_headers` is authoritative only because `wrangler.toml` has no `main`.

**Voice:** plain, senior engineer, understated. British spelling. No em-dashes in copy (use a comma, a full stop or brackets). No marketing words.

**Maintenance:** a bug that took more than an hour goes in `.claude/COMMON_MISTAKES.md`; an architectural decision goes in `.claude/decisions/`; a change to public behaviour, config or setup updates `README.md` and whichever of the two `docs/` contracts it touched; a new page, template or script means regenerating the affected section of `PROJECT_INDEX.json` and its `generated` date.
