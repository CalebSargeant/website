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

# Every locale is a complete static copy of the site, generated here. There is
# deliberately no runtime language detection: the Worker is assets-only, and
# redirecting on Accept-Language would show a crawler (which sends none) exactly
# one language while trapping readers in one they did not pick. Instead every
# language has a real URL, they point at each other with hreflang, and the reader
# chooses with the nav switcher. site.js offers a dismissible suggestion when the
# browser's language differs from the page's.
#
# `prefix` is the URL prefix AND the dist/ subdirectory. The default locale has
# none, so English stays at / and existing links never move.
LOCALES = [
    {"code": "en", "prefix": "",    "html_lang": "en-GB", "native": "English",
     "og": "en_GB"},
    {"code": "nl", "prefix": "/nl", "html_lang": "nl-NL", "native": "Nederlands",
     "og": "nl_NL"},
]
DEFAULT_LOCALE = "en"

# Every page: template, output path, and the nav/SEO metadata that goes with it.
# `nav` is the label in the header; omit it for a page that should not appear
# there (the print sheets, 404). `sitemap: False` keeps a page out of
# sitemap.xml: used for the noindex print sheets.
PAGES = [
    {"id": "home", "template": "home.html", "out": "index.html", "path": "/",
     "nav": "Home", "title": "{name} · {headline}",
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
# One set per locale. `page` and `out` are relative to the locale's prefix, so
# English prints /print/cv/ to downloads/, Dutch prints /nl/print/cv/ to
# nl/downloads/, and neither can drift from the other because both come from the
# same data through the same template.
PDF_DOCS = [
    {"page": "print/cv/", "out": "downloads/Caleb_Sargeant_CV.pdf", "max_pages": 2},
    {"page": "print/jds/", "out": "downloads/Caleb_Sargeant_JDs_and_Duties.pdf"},
    {"page": "print/cover/", "out": "downloads/Caleb_Sargeant_Cover_Letter.pdf",
     "max_pages": 1},
]


def pdf_jobs() -> list[dict]:
    """Flatten PDF_DOCS across LOCALES into the list render_pdf.py iterates."""
    jobs = []
    for loc in LOCALES:
        prefix = loc["prefix"]
        for doc in PDF_DOCS:
            jobs.append({
                "page": f"{prefix}/{doc['page']}",
                "out": f"{prefix.lstrip('/') + '/' if prefix else ''}{doc['out']}",
                "locale": loc["code"],
                "max_pages": doc.get("max_pages"),
            })
    return jobs


# Kept as a module-level name because scripts/render_pdf.py imports it.
PDFS = pdf_jobs()

MONTHS = ["", "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"]

# Per-locale date vocabulary, read from data/i18n/<code>.yml under these ui keys.
# Falling back to the English constants above means a new locale renders readable
# dates from its first build, before anyone has translated a month name.
DATE_KEYS = ("date.months", "date.months_short", "date.present",
             "date.year_unit", "date.month_unit")


# ── translation ─────────────────────────────────────────────────────────────
#
# English is the source. `data/i18n/<code>.yml` is an OVERLAY: it carries only
# what differs, and anything it omits falls back to English rather than
# rendering blank. That is deliberate. Adding a role to data/experience.yml
# without translating it yet gives a Dutch page with one English role, which is
# a visible prompt to finish the job; a hard failure would instead mean nobody
# can ship a content change until every language is done.
#
# Overlay shape:
#   ui:        flat dotted keys for interface strings, e.g. nav.experience
#   pages:     per page id -> {title, description, nav}
#   profile:   any key from data/profile.yml, same nesting
#   roles:     keyed BY ROLE ID, not by list position, so reordering the English
#              data can never silently re-point a translation at another job
#   skills:    group name -> translated group name
#
# `make build` prints how much of each locale is still falling back.


def load_i18n(code: str) -> dict:
    path = DATA / "i18n" / f"{code}.yml"
    if not path.exists():
        return {}
    return yaml.safe_load(path.read_text(encoding="utf-8")) or {}


def deep_merge(base, overlay):
    """Overlay wins, recursively, and only where it actually has a value.

    A None or an empty string in the overlay is treated as "not translated yet"
    rather than as an instruction to blank the English out, because that is what
    a half-finished translation file looks like.
    """
    if not isinstance(overlay, dict) or not isinstance(base, dict):
        return overlay if overlay not in (None, "", []) else base
    out = dict(base)
    for key, value in overlay.items():
        out[key] = deep_merge(base.get(key), value) if key in base else value
    return out


def make_translator(overlay: dict, code: str, misses: set):
    """Return t(key, **fmt) for interface strings, English on a miss."""
    ui = overlay.get("ui", {}) or {}
    english = load_i18n(DEFAULT_LOCALE).get("ui", {}) or {}

    def t(key: str, **fmt) -> str:
        value = ui.get(key, english.get(key))
        if value is None:
            # A key no locale defines is an authoring bug, not a translation gap.
            raise KeyError(f"no ui string for {key!r} (add it to data/i18n/en.yml)")
        if code != DEFAULT_LOCALE and key not in ui:
            misses.add(f"ui.{key}")
        return value.format(**fmt) if fmt else value

    return t


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


def month_label(value, short: bool = False, words=None) -> str:
    """`words` carries the locale's month names and "Present"; English if absent."""
    words = words or {}
    ym = parse_ym(value)
    if ym is None:
        return words.get("present", "Present")
    year, month = ym
    if not has_month(value):
        return str(year)
    names = words.get("months_short") if short else words.get("months")
    if names:
        name = names[month - 1]
    else:
        name = MONTHS[month][:3] if short else MONTHS[month]
    return f"{name} {year}"


def months_between(start, end, today: dt.date) -> int:
    a = parse_ym(start)
    b = parse_ym(end) or (today.year, today.month)
    return max(0, (b[0] - a[0]) * 12 + (b[1] - a[1]))


def duration_label(start, end, today: dt.date, words=None) -> str:
    words = words or {}
    yr = words.get("year_unit", "yr")
    mo = words.get("month_unit", "mo")
    n = months_between(start, end, today)
    years, months = divmod(n, 12)
    if years and months:
        return f"{years} {yr} {months} {mo}"
    if years:
        return f"{years} {yr}"
    return f"{max(months, 1)} {mo}"


def sort_key(role: dict):
    """Newest first. Current roles (end == present) sort above ended ones that
    started in the same month, which is what a reader expects to see at the top."""
    start = parse_ym(role["start"])
    return (start[0], start[1], 1 if parse_ym(role.get("end")) is None else 0)


def localise_page(page: dict, overlay: dict, prefix: str,
                  subs: dict | None = None) -> dict:
    """A copy of a PAGES entry with its prose translated and its path prefixed.

    The English title, description and nav label stay in PAGES where they are
    readable in context; the overlay supplies the rest, keyed by page id.

    `{headline}` and `{name}` in any of those three fields are substituted from
    data/profile.yml. That is what stops a page title from becoming a second
    copy of the headline: change profile.yml and every title that names it
    follows, in every locale. A plain replace rather than str.format, because a
    title is free text and a stray brace in it should not raise.
    """
    tr = (overlay.get("pages", {}) or {}).get(page["id"], {}) or {}
    out = dict(page)
    for field in ("title", "description", "nav"):
        if tr.get(field):
            out[field] = tr[field]
        value = out.get(field)
        if isinstance(value, str) and subs:
            for key, replacement in subs.items():
                value = value.replace("{" + key + "}", replacement)
            out[field] = value
    out["path"] = prefix + page["path"]
    out["href"] = out["path"]
    return out


def alternates_for(page: dict) -> list[dict]:
    """Every locale's URL for one page, for hreflang and the nav switcher.

    x-default points at the default locale: it is what a crawler with no
    language preference should be sent to, and it is the reason this site does
    not need to redirect on Accept-Language to be indexed correctly.
    """
    items = [
        {"code": loc["code"], "native": loc["native"], "html_lang": loc["html_lang"],
         "url": SITE["base_url"] + loc["prefix"] + page["path"],
         "path": loc["prefix"] + page["path"]}
        for loc in LOCALES
    ]
    return items


# ── the render context ──────────────────────────────────────────────────────

def build_context(locale: dict | None = None) -> dict:
    locale = locale or LOCALES[0]
    code = locale["code"]
    prefix = locale["prefix"]
    overlay = load_i18n(code)
    misses: set[str] = set()
    t = make_translator(overlay, code, misses)

    # Resolved once per locale: every date and duration on the page goes
    # through it, so a new language needs no code change here.
    ui_map = overlay.get("ui", {}) or {}
    words = {k.split(".", 1)[1]: ui_map[k] for k in DATE_KEYS if ui_map.get(k)}

    today = dt.date.today()
    profile = load("profile")
    experience = load("experience")
    education = load("education")
    courses = load("courses")
    skills = load("skills")

    profile = deep_merge(profile, overlay.get("profile", {}) or {})

    # Roles are overlaid by id, so reordering the English data cannot re-point a
    # translation at a different job.
    role_overlay = overlay.get("roles", {}) or {}
    experience["roles"] = [
        deep_merge(r, role_overlay.get(r["id"], {}) or {}) for r in experience["roles"]
    ]
    if code != DEFAULT_LOCALE:
        for r in experience["roles"]:
            if r["id"] not in role_overlay:
                misses.add(f"roles.{r['id']}")

    skill_overlay = overlay.get("skills", {}) or {}
    skills["groups"] = [
        dict(g, name=skill_overlay.get(g["name"], g["name"])) for g in skills["groups"]
    ]

    # What a page title may name rather than copy. See localise_page.
    page_subs = {"headline": profile["headline"], "name": profile["name"]}

    roles = sorted(experience["roles"], key=sort_key, reverse=True)
    by_id = {r["id"]: r for r in roles}
    for role in roles:
        role["is_current"] = parse_ym(role.get("end")) is None
        role["start_label"] = month_label(role["start"], words=words)
        role["end_label"] = month_label(role.get("end"), words=words)
        role["start_short"] = month_label(role["start"], short=True, words=words)
        role["end_short"] = month_label(role.get("end"), short=True, words=words)
        role["duration"] = duration_label(role["start"], role.get("end"), today, words)
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
        course["date_label"] = month_label(course["date"], words=words)
    for item in edu:
        item["completed_label"] = month_label(item["completed"], words=words)

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
        "soft_skills": overlay.get("soft_skills") or skills.get("soft_skills", []),
        "cv_skills": cv_skills,
        "focus_areas": ["platform", "cloud", "network", "security"],
        "nav": [localise_page(p, overlay, prefix, page_subs) for p in PAGES if p.get("nav")],
        "locale": locale,
        "locales": LOCALES,
        "default_locale": DEFAULT_LOCALE,
        "t": t,
        "url": lambda path: (prefix + path) if path.startswith("/") else path,
        "pdfs": {"cv": f"{prefix}/downloads/Caleb_Sargeant_CV.pdf",
                 "jds": f"{prefix}/downloads/Caleb_Sargeant_JDs_and_Duties.pdf",
                 "cover": f"{prefix}/downloads/Caleb_Sargeant_Cover_Letter.pdf"},
        "page_subs": page_subs,
        "month_filter": lambda v, short=False: month_label(v, short, words),
        "_misses": misses,
        "today": today,
        "build_date": today.isoformat(),
        "career_start_year": career_start[0],
        "years_experience": years_experience,
    }


# ── rendering ───────────────────────────────────────────────────────────────

def render() -> dict:
    """Render every page in every locale. Returns the per-locale miss report."""
    env = Environment(
        loader=FileSystemLoader(ROOT / "templates"),
        autoescape=True,
        undefined=StrictUndefined,   # a typo in a template fails the build
        trim_blocks=True,
        lstrip_blocks=True,
    )

    report = {}
    for locale in LOCALES:
        context = build_context(locale)
        prefix = locale["prefix"].lstrip("/")
        subs = context["page_subs"]
        count = 0
        for page in PAGES:
            localised = localise_page(page, load_i18n(locale["code"]),
                                      locale["prefix"], subs)
            out = f"{prefix}/{page['out']}" if prefix else page["out"]
            target = OUT / out
            target.parent.mkdir(parents=True, exist_ok=True)
            env.filters["month"] = context["month_filter"]
            html = env.get_template(page["template"]).render(
                page=localised,
                alternates=alternates_for(page),
                **{k: v for k, v in context.items() if k != "_misses"},
            )
            target.write_text(html, encoding="utf-8")
            count += 1
        report[locale["code"]] = sorted(context["_misses"])
        print(f"  {locale['code']}: {count} pages -> {prefix or '/'}")
    return report


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


def write_sitemap(today: str) -> None:
    """One <url> per locale per page, each listing every locale as an alternate.

    Listing the alternates inside every entry (rather than only on the English
    one) is what tells a crawler these are translations of each other rather
    than near-duplicate pages competing with one another.
    """
    blocks = []
    for page in PAGES:
        if not page.get("sitemap", True):
            continue
        alts = alternates_for(page)
        links = "".join(
            f'\n    <xhtml:link rel="alternate" hreflang="{a["html_lang"]}" href="{a["url"]}"/>'
            for a in alts
        )
        default = SITE["base_url"] + page["path"]
        links += f'\n    <xhtml:link rel="alternate" hreflang="x-default" href="{default}"/>'
        for alt in alts:
            blocks.append(
                f'  <url>\n    <loc>{alt["url"]}</loc>'
                f'\n    <lastmod>{today}</lastmod>{links}\n  </url>'
            )
    (OUT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'
        '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
        + "\n".join(blocks) + "\n</urlset>\n", encoding="utf-8")


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

    report = render()
    copy_static()
    write_sitemap(dt.date.today().isoformat())

    count = sum(1 for p in OUT.rglob("*") if p.is_file())
    print(f"Built {count} files into dist/ across {len(LOCALES)} locales")

    # Untranslated content is a fallback to English, not a failure, so it has to
    # be visible here or it is invisible everywhere.
    for code, misses in report.items():
        if not misses:
            continue
        print(f"  {code}: {len(misses)} untranslated "
              f"({', '.join(misses[:6])}{'...' if len(misses) > 6 else ''})")

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
