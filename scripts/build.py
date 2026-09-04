#!/usr/bin/env python3
"""Render the site from data/ + templates/ into dist/.

    ./scripts/build.py                 site only
    ./scripts/build.py --pdf           site + the three PDFs (needs Playwright)
    ./scripts/build.py --serve         build, then serve dist/ on :8788

dist/ is what Wrangler uploads. Nothing else in the repo is published, so the
README, the data files and these scripts never reach the public site.

The one rule this file exists to enforce: `data/` is the only place a fact
about Caleb is written down. Every page, and every PDF, is a rendering of it.
"""

from __future__ import annotations

import argparse
import datetime as dt
import http.server
import re
import shutil
import socketserver
import subprocess
import sys
from pathlib import Path

import yaml
from jinja2 import Environment, FileSystemLoader, StrictUndefined

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
OUT = ROOT / "dist"

SITE = {
    "base_url": "https://www.calebsargeant.com",
    "name": "Caleb Sargeant",
    "repo": "https://github.com/CalebSargeant/website",
}

# Every page: template, output path, and the nav/SEO metadata that goes with it.
# `nav` is the label in the header; omit it for a page that should not appear
# there (the print sheets, 404). `sitemap: False` keeps a page out of
# sitemap.xml: used for the noindex print sheets.
PAGES = [
    {"id": "home", "template": "home.html", "out": "index.html", "path": "/",
     "nav": "Home", "title": "Caleb Sargeant · Network, Security & DevOps Engineer",
     "description": "Platform, cloud, network and security engineer in Eindhoven, "
                    "Netherlands. Kubernetes, Terraform, Azure and AWS, and the "
                    "networks underneath them. CV generated straight from this site."},
    {"id": "experience", "template": "experience.html", "out": "experience/index.html",
     "path": "/experience/", "nav": "Experience", "title": "Experience · Caleb Sargeant",
     "description": "Twelve engineering roles since 2012, from MSP helpdesk to "
                    "platform engineering, with the full duty list for each."},
    {"id": "education", "template": "education.html", "out": "education/index.html",
     "path": "/education/", "nav": "Education", "title": "Education & courses · Caleb Sargeant",
     "description": "Certifications, qualifications and training: CCNP Security, "
                    "CCNP Routing & Switching, MCSE, ITIL and AWS."},
    {"id": "cv", "template": "cv.html", "out": "cv/index.html", "path": "/cv/",
     "nav": "CV", "title": "CV · Caleb Sargeant",
     "description": "The CV, on screen and as a PDF. Both are generated from the "
                    "same data as the rest of this site."},
    {"id": "contact", "template": "contact.html", "out": "contact/index.html",
     "path": "/contact/", "nav": "Contact", "title": "Contact · Caleb Sargeant",
     "description": "Email, phone, LinkedIn, GitHub, and a link to book a slot."},
    {"id": "notfound", "template": "404.html", "out": "404.html", "path": "/404.html",
     "title": "Not found · Caleb Sargeant", "description": "That page does not exist.",
     "sitemap": False},
    # Print sheets. Public (handy as "view in browser"), noindex, and the source
    # the PDF renderer prints from.
    {"id": "print-cv", "template": "print/cv.html", "out": "print/cv/index.html",
     "path": "/print/cv/", "title": "Caleb Sargeant CV", "description": "",
     "print": True, "sitemap": False},
    {"id": "print-jds", "template": "print/jds.html", "out": "print/jds/index.html",
     "path": "/print/jds/", "title": "Caleb Sargeant, Job Descriptions & Duties",
     "description": "", "print": True, "sitemap": False},
    {"id": "print-cover", "template": "print/cover.html", "out": "print/cover/index.html",
     "path": "/print/cover/", "title": "Caleb Sargeant, Cover Letter",
     "description": "", "print": True, "sitemap": False},
]

# What each print sheet becomes. Consumed by scripts/render_pdf.py, which imports
# this list rather than keeping its own copy.
PDFS = [
    {"page": "/print/cv/", "out": "downloads/Caleb_Sargeant_CV.pdf"},
    {"page": "/print/jds/", "out": "downloads/Caleb_Sargeant_JDs_and_Duties.pdf"},
    {"page": "/print/cover/", "out": "downloads/Caleb_Sargeant_Cover_Letter.pdf"},
]

MONTHS = ["", "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"]


# ── data helpers ────────────────────────────────────────────────────────────

def load(name: str) -> dict:
    return yaml.safe_load((DATA / f"{name}.yml").read_text(encoding="utf-8")) or {}


def parse_ym(value) -> tuple[int, int] | None:
    """`2024-05` / `2024` / a date / `present` -> (year, month), or None for present."""
    if value in (None, "present", "Present"):
        return None
    if isinstance(value, dt.date):
        return value.year, value.month
    text = str(value).strip()
    m = re.match(r"^(\d{4})(?:-(\d{1,2}))?", text)
    if not m:
        raise ValueError(f"unparseable date: {value!r}")
    return int(m.group(1)), int(m.group(2) or 1)


def has_month(value) -> bool:
    """True when the source value actually named a month.

    parse_ym defaults a bare `2013` to January so it can still be sorted and
    subtracted. Printing that January would put a month on the page that nobody
    wrote down, so the labels ask this first.
    """
    if isinstance(value, dt.date):
        return True
    return bool(re.match(r"^\d{4}-\d{1,2}", str(value).strip()))


def month_label(value, short: bool = False) -> str:
    ym = parse_ym(value)
    if ym is None:
        return "Present"
    year, month = ym
    if not has_month(value):
        return str(year)
    name = MONTHS[month]
    return f"{name[:3] if short else name} {year}"


def months_between(start, end, today: dt.date) -> int:
    a = parse_ym(start)
    b = parse_ym(end) or (today.year, today.month)
    return max(0, (b[0] - a[0]) * 12 + (b[1] - a[1]))


def duration_label(start, end, today: dt.date) -> str:
    n = months_between(start, end, today)
    years, months = divmod(n, 12)
    if years and months:
        return f"{years} yr {months} mo"
    if years:
        return f"{years} yr"
    return f"{max(months, 1)} mo"


def sort_key(role: dict):
    """Newest first. Current roles (end == present) sort above ended ones that
    started in the same month, which is what a reader expects to see at the top."""
    start = parse_ym(role["start"])
    return (start[0], start[1], 1 if parse_ym(role.get("end")) is None else 0)


# ── the render context ──────────────────────────────────────────────────────

def build_context() -> dict:
    today = dt.date.today()
    profile = load("profile")
    experience = load("experience")
    education = load("education")
    courses = load("courses")
    skills = load("skills")

    roles = sorted(experience["roles"], key=sort_key, reverse=True)
    by_id = {r["id"]: r for r in roles}
    for role in roles:
        role["is_current"] = parse_ym(role.get("end")) is None
        role["start_label"] = month_label(role["start"])
        role["end_label"] = month_label(role.get("end"))
        role["start_short"] = month_label(role["start"], short=True)
        role["end_short"] = month_label(role.get("end"), short=True)
        role["duration"] = duration_label(role["start"], role.get("end"), today)
        role["start_year"] = parse_ym(role["start"])[0]
        role.setdefault("focus", [])
        role.setdefault("highlights", [])
        role.setdefault("stack", [])
        # `duties_see` points at another role rather than repeating its duty
        # list. Resolve it here so no template ever has to know about it.
        if not role.get("duties") and role.get("duties_see"):
            role["duties"] = by_id.get(role["duties_see"], {}).get("duties", [])
            role["duties_shared_with"] = by_id.get(role["duties_see"], {}).get("company")
        role.setdefault("duties", [])

    # The career starts at the oldest role, not on 1 January of its year. Count
    # completed years from that month, or the site claims a year Caleb has not
    # worked yet for the ten months between January and the anniversary.
    career_start = min(parse_ym(r["start"]) for r in roles)
    years_experience = months_between(
        f"{career_start[0]:04d}-{career_start[1]:02d}", None, today) // 12

    # Stats: `since` counts from a year so nobody has to bump a number. A `since`
    # that names the career's own start year uses the month-accurate count above.
    stats = []
    for stat in profile.get("stats", []):
        entry = dict(stat)
        if "since" in entry:
            entry["value"] = (years_experience if entry["since"] == career_start[0]
                              else today.year - entry["since"])
        stats.append(entry)
    profile["stats"] = stats

    edu = sorted(education["education"],
                 key=lambda e: parse_ym(e["completed"]), reverse=True)
    crs = sorted(courses["courses"], key=lambda c: parse_ym(c["date"]), reverse=True)
    for course in crs:
        course["date_label"] = month_label(course["date"])
    for item in edu:
        item["completed_label"] = month_label(item["completed"])

    cv_skills = [s for g in skills["groups"] for s in g["skills"] if s.get("cv")]

    return {
        "site": SITE,
        "profile": profile,
        "roles": roles,
        "current_roles": [r for r in roles if r["is_current"]],
        "education": edu,
        "featured_education": [e for e in edu if e.get("featured")],
        "in_progress": education.get("in_progress", []),
        "courses": crs,
        "featured_courses": [c for c in crs if c.get("featured")],
        "skill_groups": skills["groups"],
        "soft_skills": skills.get("soft_skills", []),
        "cv_skills": cv_skills,
        "focus_areas": ["platform", "cloud", "network", "security"],
        "nav": [p for p in PAGES if p.get("nav")],
        "pdfs": {"cv": "/downloads/Caleb_Sargeant_CV.pdf",
                 "jds": "/downloads/Caleb_Sargeant_JDs_and_Duties.pdf",
                 "cover": "/downloads/Caleb_Sargeant_Cover_Letter.pdf"},
        "today": today,
        "build_date": today.isoformat(),
        "career_start_year": career_start[0],
        "years_experience": years_experience,
    }


# ── rendering ───────────────────────────────────────────────────────────────

def render(context: dict) -> None:
    env = Environment(
        loader=FileSystemLoader(ROOT / "templates"),
        autoescape=True,
        undefined=StrictUndefined,   # a typo in a template fails the build
        trim_blocks=True,
        lstrip_blocks=True,
    )
    env.filters["month"] = month_label

    for page in PAGES:
        target = OUT / page["out"]
        target.parent.mkdir(parents=True, exist_ok=True)
        html = env.get_template(page["template"]).render(page=page, **context)
        target.write_text(html, encoding="utf-8")
        print(f"  rendered {page['out']}")


def copy_static() -> None:
    """Copy the byte-for-byte files: assets/ and the few root files that ship."""
    shutil.copytree(ROOT / "assets", OUT / "assets",
                    ignore=shutil.ignore_patterns(".DS_Store", "__pycache__"))
    for name in ("robots.txt", "favicon.ico", ".nojekyll", "_headers", "llms.txt"):
        src = ROOT / name
        if src.exists():
            shutil.copy2(src, OUT / name)
    wellknown = ROOT / ".well-known"
    if wellknown.is_dir():
        shutil.copytree(wellknown, OUT / ".well-known")


def write_sitemap(context: dict) -> None:
    today = context["build_date"]
    urls = "\n".join(
        f"  <url><loc>{SITE['base_url']}{p['path']}</loc>"
        f"<lastmod>{today}</lastmod></url>"
        for p in PAGES if p.get("sitemap", True)
    )
    (OUT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"{urls}\n</urlset>\n", encoding="utf-8")


def serve(port: int = 8788) -> None:
    handler = lambda *a, **k: http.server.SimpleHTTPRequestHandler(
        *a, directory=str(OUT), **k)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", port), handler) as httpd:
        print(f"\nServing {OUT} at http://127.0.0.1:{port}/  (Ctrl-C to stop)")
        httpd.serve_forever()


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--pdf", action="store_true", help="also render the PDFs")
    ap.add_argument("--serve", action="store_true", help="serve dist/ afterwards")
    ap.add_argument("--port", type=int, default=8788)
    args = ap.parse_args()

    shutil.rmtree(OUT, ignore_errors=True)
    OUT.mkdir(parents=True)

    context = build_context()
    render(context)
    copy_static()
    write_sitemap(context)

    count = sum(1 for p in OUT.rglob("*") if p.is_file())
    print(f"Built {count} files into dist/")

    if args.pdf:
        print("Rendering PDFs...")
        result = subprocess.run([sys.executable, str(ROOT / "scripts" / "render_pdf.py")])
        if result.returncode != 0:
            return result.returncode

    if args.serve:
        serve(args.port)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
