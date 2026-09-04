#!/usr/bin/env python3
"""Generate the committed image assets: the OG card and the raster favicons.

    ./scripts/render_images.py

These are build artefacts, but unlike the PDFs they are COMMITTED. The PDFs must
never drift from data/, so they are rebuilt on every deploy; the OG card and the
favicons change about once a year, and committing them keeps the normal build
free of a Chromium dependency. Re-run this after touching assets/favicon.svg or
templates/social/og.html.

Outputs
    assets/og/og-default.png     1200x630, the Open Graph / Twitter card
    assets/apple-touch-icon.png  180x180, square and opaque (iOS masks it itself)
    assets/favicon-32.png        32x32, circular, transparent
    assets/favicon-16.png        16x16, circular, transparent
    favicon.ico                  16+32, at the repo root so /favicon.ico resolves

The favicons are the portrait, not the mark. A photo scaled to 16px is mush
unless it is cropped to the face first, so FACE_CROP below zooms and re-centres
assets/img/caleb.jpg rather than letting the whole head-and-shoulders shrink
into the tab. Adjust those two numbers if the photo is ever replaced.

Needs Playwright's Chromium:
    python3 -m pip install -r requirements.txt
    python3 -m playwright install chromium
"""

from __future__ import annotations

import base64
import importlib.util
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# How the portrait is framed for an icon. `zoom` is the CSS background-size as a
# percentage: 210 means the photo is drawn at 2.1x the icon box, so only the
# middle stays. `focus` is background-position, tuned so the crop lands on the
# face rather than the collar. Check the 16px output after changing either: that
# is the size that decides whether this reads as a person or as a smudge.
FACE_CROP = {"zoom": 188, "focus": "50% 21%"}


def load_build_module():
    """Import scripts/build.py for its render context, without making it a package."""
    spec = importlib.util.spec_from_file_location("site_build", ROOT / "scripts" / "build.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def write_ico(png_paths: list[Path], out: Path) -> None:
    """Assemble a multi-size .ico from PNGs.

    Hand-rolled rather than pulled from Pillow: the ICO container is a 6-byte
    header plus a 16-byte directory entry per image, and modern browsers accept
    PNG-compressed entries directly, so there is nothing to encode. One less
    dependency in requirements.txt for eleven lines of struct.
    """
    images = [(p.read_bytes(), int(p.stem.rsplit("-", 1)[-1])) for p in png_paths]
    header = struct.pack("<HHH", 0, 1, len(images))
    offset = 6 + 16 * len(images)
    directory, body = b"", b""
    for data, size in images:
        directory += struct.pack(
            "<BBBBHHII",
            0 if size >= 256 else size, 0 if size >= 256 else size,
            0, 0, 1, 32, len(data), offset,
        )
        body += data
        offset += len(data)
    out.write_bytes(header + directory + body)


def main() -> int:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("Playwright is not installed.\n"
              "  python3 -m pip install -r requirements.txt\n"
              "  python3 -m playwright install chromium", file=sys.stderr)
        return 1

    build = load_build_module()
    context = build.build_context()

    from jinja2 import Environment, FileSystemLoader, StrictUndefined
    env = Environment(loader=FileSystemLoader(ROOT / "templates"),
                      autoescape=True, undefined=StrictUndefined,
                      trim_blocks=True, lstrip_blocks=True)
    env.filters["month"] = build.month_label
    og_html = env.get_template("social/og.html").render(page={"id": "og"}, **context)

    (ROOT / "assets" / "og").mkdir(parents=True, exist_ok=True)
    og_out = ROOT / "assets" / "og" / "og-default.png"
    # Inlined as a data: URI, not linked as file://. A page built with
    # set_content has an opaque origin, and Chromium refuses to load a file://
    # subresource into it: the screenshot comes back a blank 108-byte PNG with
    # no error anywhere. Same trap as render_pdf.py's reason for serving dist/
    # over real HTTP.
    portrait_b64 = base64.b64encode(
        (ROOT / "assets" / "img" / "caleb.jpg").read_bytes()).decode("ascii")
    portrait = "data:image/jpeg;base64," + portrait_b64

    def icon_html(size: int, circular: bool) -> str:
        """One div, the photo as a zoomed background, optionally circle-masked."""
        return (
            "<style>html,body{margin:0;padding:0;background:transparent}"
            f"i{{display:block;width:{size}px;height:{size}px;"
            f"background-image:url('{portrait}');"
            f"background-size:{FACE_CROP['zoom']}% auto;"
            f"background-position:{FACE_CROP['focus']};"
            "background-repeat:no-repeat;"
            + ("border-radius:50%;" if circular else "")
            + "}</style><i></i>"
        )

    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        try:
            # OG card. deviceScaleFactor 1: the spec wants exactly 1200x630, and
            # a 2x shot would be rejected by some scrapers for being oversized.
            page = browser.new_page(viewport={"width": 1200, "height": 630},
                                    device_scale_factor=1)
            page.set_content(og_html, wait_until="networkidle")
            page.evaluate("document.fonts.ready")
            page.screenshot(path=str(og_out))
            page.close()
            print(f"  {og_out.relative_to(ROOT)}  1200x630")

            # Favicons, cropped from the portrait. The tab icon is Caleb's face:
            # on a personal site that identifies the tab faster than a mark does.
            for size in (180, 32, 16):
                apple = size == 180
                name = "apple-touch-icon.png" if apple else f"favicon-{size}.png"
                target = ROOT / "assets" / name
                page = browser.new_page(viewport={"width": size, "height": size},
                                        device_scale_factor=1)
                # iOS applies its own rounded mask and composites onto black, so
                # the touch icon is square and opaque; the tab icons are circles
                # on transparency, which is what reads cleanly beside a favicon
                # row of other sites.
                page.set_content(icon_html(size, circular=not apple), wait_until="load")
                page.screenshot(path=str(target), omit_background=not apple)
                page.close()
                print(f"  {target.relative_to(ROOT)}  {size}x{size}")
        finally:
            browser.close()

    write_ico([ROOT / "assets" / "favicon-16.png", ROOT / "assets" / "favicon-32.png"],
              ROOT / "favicon.ico")
    print(f"  favicon.ico  16+32")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
