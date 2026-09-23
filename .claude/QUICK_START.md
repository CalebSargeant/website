# Quick start

Python 3 and `make`. No node build, no bundler, no test suite. Commands read from the `Makefile`, `scripts/build.py` and `.github/workflows/deploy.yml`.

- **`make install`**: `python3 -m pip install -r requirements.txt`, then `python3 -m playwright install chromium`. The Chromium download is a **separate step** from the pip install; skipping it leaves `make pdf` failing with a browser-not-found error, not a missing package.
- **`make build`**: renders `data/` + `templates/` into `dist/` (pages, markdown twins, `llms.txt`, `llms-full.txt`) and copies `assets/`, then writes the MCP corpus to `.docs-index/index/website.json` and the agent skills plus their `index.json` to `dist/.well-known/agent-skills/`. Needs jinja2 and pyyaml only, no Chromium. `dist/` is deleted first, every time.
- **`make pdf`**: build, then print `dist/print/{cv,jds,cover}/` to `dist/downloads/*.pdf` via Playwright.
- **`make serve`**: build with PDFs, then serve `dist/` on http://127.0.0.1:8788/. Renders the PDFs deliberately, so a preview never has dead `/downloads/` links.
- **`make clean`**: `rm -rf dist .docs-index`.

Underneath, everything is `python3 scripts/build.py [--pdf] [--serve] [--port N]`. Use `python3` explicitly; the `Makefile` defaults `PYTHON ?= python3` for the same reason.

**Checks**

- `python3 scripts/render_pdf.py --check`: the PDFs exist, start with `%PDF-`, and are over 5 KB. Run it after `make pdf`; a half-failed render still writes a few KB.
- `make build && npx wrangler dev`: the only local run that applies `_headers` and `not_found_handling`, so it is the real check of the CSP and the 404. No arguments; `wrangler.toml` supplies everything. It is not a check of charsets: dev adds `charset=utf-8` to text types that production serves without one. Restart it after every build: the build deletes `dist/`, and a running dev server keeps serving the deleted directory, which answers 404 for everything.

**Rarely**

- `python3 scripts/render_images.py`: regenerates the OG card and the favicons. These are committed (unlike the PDFs), so only run it after editing `assets/favicon.svg` or `templates/social/og.html`, and commit the output.

**Deploy** (CI does this, not you): `wrangler deploy` on push to `main`, then the corpus into R2 with `wrangler r2 object put ... --remote`; `wrangler versions upload --preview-alias pr-<N>` on a PR, with the URL posted back on the pull request. Wrangler needs Node 22 or newer.
