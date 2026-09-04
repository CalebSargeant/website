#!/usr/bin/env python3
"""Print the three sheets in dist/print/ to the three PDFs in dist/downloads/.

    ./scripts/render_pdf.py            render every PDF from dist/
    ./scripts/render_pdf.py --check    verify the PDFs exist and are non-trivial

Run ./scripts/build.py first: this script prints what is already in dist/, it
does not render templates. `build.py --pdf` calls it as a subprocess.

The list of documents lives in build.py (PDFS) and is imported, not copied, so
adding a fourth print sheet there is the only edit needed to get a fourth PDF.
"""

from __future__ import annotations

import argparse
import contextlib
import functools
import http.server
import re
import sys
import threading
from pathlib import Path

# Run directly or as a subprocess, either way build.py sits next to us.
sys.path.insert(0, str(Path(__file__).resolve().parent))

INSTALL_HINT = (
    "Install what the renderer needs, then run this again:\n"
    "    python3 -m pip install -r requirements.txt\n"
    "    python3 -m playwright install chromium"
)

try:
    from build import OUT, PDFS
except ImportError as exc:  # pyyaml / jinja2 missing -> build.py will not import
    print(f"error: cannot import scripts/build.py ({exc}).\n{INSTALL_HINT}",
          file=sys.stderr)
    raise SystemExit(2) from exc

# Layout limits from docs/design-system.md. Going over is not fatal, it is the
# signal that an edit in data/ has outgrown the sheet it renders onto.
MAX_PAGES = {"/print/cv/": 2, "/print/cover/": 1}

# A PDF of a blank or half-failed page still weighs a few KB, so "the file
# exists" is not a useful check on its own.
MIN_BYTES = 5_000


# ── local web server ────────────────────────────────────────────────────────

class _QuietHandler(http.server.SimpleHTTPRequestHandler):
    """SimpleHTTPRequestHandler without the per-request stderr chatter."""

    def log_message(self, fmt, *args):  # noqa: A002 - signature is the stdlib's
        pass


@contextlib.contextmanager
def serve(directory: Path):
    """Serve `directory` on an ephemeral localhost port for the duration.

    Printing from file:// URLs looks like it works and then silently ruins the
    output: the Google Fonts request is blocked as cross-origin, root-relative
    asset paths resolve against the filesystem root, and the PDF comes out in a
    fallback font. So the sheets are always fetched over real HTTP.
    """
    handler = functools.partial(_QuietHandler, directory=str(directory))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}"
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


# ── PDF inspection ──────────────────────────────────────────────────────────

def approx_page_count(pdf: bytes) -> int | None:
    """Best-effort page count, no PDF library.

    Every page object carries `/Type /Page` (or `/Type/Page`); the page *tree*
    node carries `/Type /Pages`, hence the negative lookahead. Chromium writes
    these dictionaries uncompressed today, but that is not guaranteed, so an
    unreadable file returns None rather than a wrong number.
    """
    count = len(re.findall(rb"/Type\s*/Page(?![s\w])", pdf))
    return count or None


def describe(path: Path) -> str:
    data = path.read_bytes()
    pages = approx_page_count(data)
    pages_text = f"~{pages} page{'s' if pages != 1 else ''}" if pages else "page count unknown"
    return f"{pages_text}, {len(data) / 1024:.0f} KB"


# ── rendering ───────────────────────────────────────────────────────────────

def render_all(base_url: str) -> int:
    """Print every entry in PDFS. Returns the number of warnings raised."""
    from playwright.sync_api import sync_playwright

    warnings = 0
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page()
        page.set_default_timeout(30_000)

        for spec in PDFS:
            target = OUT / spec["out"]
            target.parent.mkdir(parents=True, exist_ok=True)

            page.goto(base_url + spec["page"], wait_until="networkidle")
            # networkidle fires when the font *files* have arrived, which is
            # before the browser has swapped them in. Without this wait the
            # first sheet reliably prints in the fallback font.
            page.evaluate("() => document.fonts.ready.then(() => document.fonts.status)")

            # prefer_css_page_size honours `@page { size: A4 }` in print.css;
            # zero margins because the .sheet element owns its own padding.
            page.pdf(
                path=str(target),
                format="A4",
                print_background=True,
                margin={"top": "0", "right": "0", "bottom": "0", "left": "0"},
                prefer_css_page_size=True,
            )

            pages = approx_page_count(target.read_bytes())
            print(f"  {spec['out']}  ({describe(target)})")

            limit = MAX_PAGES.get(spec["page"])
            if limit and pages and pages > limit:
                warnings += 1
                print(f"  warning: {spec['out']} is {pages} pages, expected at "
                      f"most {limit}. Trim the data or the layout.", file=sys.stderr)

        browser.close()
    return warnings


def check() -> int:
    missing = []
    for spec in PDFS:
        target = OUT / spec["out"]
        if not target.exists():
            missing.append(f"{spec['out']}: not built")
            continue
        data = target.read_bytes()
        if not data.startswith(b"%PDF-"):
            missing.append(f"{spec['out']}: not a PDF")
        elif len(data) < MIN_BYTES:
            missing.append(f"{spec['out']}: only {len(data)} bytes, looks empty")
        else:
            print(f"  ok  {spec['out']}  ({describe(target)})")

    for problem in missing:
        print(f"  FAIL  {problem}", file=sys.stderr)
    return 1 if missing else 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--check", action="store_true",
                    help="verify the PDFs exist and are non-trivial, render nothing")
    args = ap.parse_args()

    if args.check:
        return check()

    missing_sheets = [s["page"] for s in PDFS
                      if not (OUT / s["page"].strip("/") / "index.html").exists()]
    if missing_sheets:
        print("error: dist/ has no print sheets to render "
              f"({', '.join(missing_sheets)}). Run ./scripts/build.py first.",
              file=sys.stderr)
        return 2

    try:
        import playwright  # noqa: F401
    except ImportError:
        print(f"error: Playwright is not installed.\n{INSTALL_HINT}", file=sys.stderr)
        return 2

    with serve(OUT) as base_url:
        try:
            warnings = render_all(base_url)
        except Exception as exc:
            # Almost always the browser binary rather than the package: a deploy
            # that quietly ships no CV is worse than one that fails here.
            print(f"error: rendering failed ({type(exc).__name__}: {exc}).\n"
                  f"{INSTALL_HINT}", file=sys.stderr)
            return 1

    print(f"Wrote {len(PDFS)} PDFs into dist/downloads/"
          + (f" with {warnings} warning(s)" if warnings else ""))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
