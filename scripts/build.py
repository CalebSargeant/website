#!/usr/bin/env python3
"""Render the site from data/ + templates/ into dist/.

    ./scripts/build.py                 site only
    ./scripts/build.py --pdf           site + the three PDFs (needs Playwright)
    ./scripts/build.py --serve         build, then serve dist/ on :8788

dist/ is what Wrangler uploads. Nothing else in the repo is published, so the
README, the data files and these scripts never reach the public site. The one
other output is .docs-index/, the search corpus CI puts in R2 for the MCP server.

The one rule this file exists to enforce: `data/` is the only place a fact
about Caleb is written down. Every page, every PDF, and every file written for
assistants (llms.txt, the markdown twins, the corpus) is a rendering of it.
"""

from __future__ import annotations

import argparse
import datetime as dt
import http.server
import json
import os
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

# The MCP server at mcp.calebsargeant.com reads one JSON object per source repo
# from the calebsargeant-docs-index R2 bucket. This is this repo's, published by
# the production deploy job. Outside dist/ on purpose: it is not a page, and
# nothing in dist/ should be reachable that the Worker was not meant to serve.
CORPUS_OUT = ROOT / ".docs-index" / "index" / "website.json"

SITE = {
    # The apex is canonical. www.calebsargeant.com is 301'd here by a Redirect
    # Rule on the zone (see wrangler.toml), and every canonical, hreflang,
    # sitemap entry and JSON-LD id is built from this value. Pointing them at
    # www would name a URL that only ever answers with a redirect, which search
    # engines treat as a canonical to second-guess rather than to trust.
    "base_url": "https://calebsargeant.com",
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
#
# Every page in the sitemap also gets a markdown twin at <path>index.md,
# rendered from templates/md/ with the same context (see has_markdown). A new
# page in the sitemap therefore needs templates/md/<name>.md as well, or the
# build fails with TemplateNotFound.
PAGES = [
    {"id": "home", "template": "home.html", "out": "index.html", "path": "/",
     "nav": "Home", "title": "{name} · {headline}",
     # Under the ~155 characters a search result shows before it cuts a
     # description off; the sentence about the CV build was the part lost.
     "description": "Platform, cloud, network and security engineer in Limburg, "
                    "Netherlands. Kubernetes, Terraform, Azure and AWS, and the "
                    "networks underneath them."},
    {"id": "experience", "template": "experience.html", "out": "experience/index.html",
     "path": "/experience/", "nav": "Experience", "title": "Experience · Caleb Sargeant",
     "description": "{roles} engineering roles since 2012, from MSP helpdesk to "
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
    # Not in the nav on purpose: most visitors will never want it, and the ones
    # who do arrive from the home page hint, the contact page or the footer.
    {"id": "ai", "template": "ai.html", "out": "ai/index.html", "path": "/ai/",
     "title": "Ask your AI about me · Caleb Sargeant",
     "description": "Connect Claude, Codex or ChatGPT to the public MCP server for "
                    "this site, or ask Nievah here, and find out whether I fit "
                    "your role. No sign-in."},
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

# The MCP corpus: what an agent can search and read through mcp.calebsargeant.com.
# English only, one document per kind of question, each citing the page (or the
# anchor on it) that says the same thing. The JSON keeps this order, so
# profile.md, the one to read first, comes first.
#
# `path` is what the MCP ranks on first (filename tokens score highest) and what
# its read_doc takes, so the names are plain nouns and stay put: renaming one
# breaks every agent that remembered it. `each: role` expands to one document
# per role, named by the role's id, which is also the id of its article on
# /experience.
CORPUS = [
    {"path": "profile.md", "template": "md/corpus/profile.md", "url": "/"},
    {"path": "experience.md", "template": "md/corpus/experience.md", "url": "/experience/"},
    {"path": "experience/{id}.md", "template": "md/corpus/role.md",
     "url": "/experience/#{id}", "each": "role"},
    {"path": "education.md", "template": "md/corpus/education.md", "url": "/education/"},
    {"path": "courses.md", "template": "md/corpus/courses.md", "url": "/education/#courses"},
    {"path": "skills.md", "template": "md/corpus/skills.md", "url": "/#skills"},
    {"path": "contact.md", "template": "md/corpus/contact.md", "url": "/contact/"},
]

# Cloudflare applies at most this many rules from _headers.
HEADERS_RULE_LIMIT = 100

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


def has_markdown(page: dict) -> bool:
    """True for the pages that get a markdown twin at <path>index.md.

    Exactly the pages in the sitemap, the ones worth an assistant reading. A
    print sheet is its page with the design stripped out, which is what the
    twin already is, and a 404 has nothing to say. Every such page lives at a
    directory URL (/experience/), so llmstxt.org's rule for a URL without a
    file name applies: append index.md.
    """
    return page.get("sitemap", True)


def markdown_template(page: dict) -> str:
    """templates/md/ mirrors the page templates: experience.html -> md/experience.md."""
    return "md/" + page["template"].removesuffix(".html") + ".md"


def localise_page(page: dict, overlay: dict, prefix: str,
                  subs: dict | None = None) -> dict:
    """A copy of a PAGES entry with its prose translated and its path prefixed.

    The English title, description and nav label stay in PAGES where they are
    readable in context; the overlay supplies the rest, keyed by page id.

    `{headline}`, `{name}` and `{roles}` in any of those three fields are
    substituted from the data. That is what stops a page title from becoming a
    second copy of the headline, and a page description from carrying a role
    count that has to be remembered: change the data and every title or
    description that names it follows, in every locale. A plain replace rather
    than str.format, because a title is free text and a stray brace in it should
    not raise.
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
    # The one definition of where a twin lives: render() writes it here,
    # base.html links it, and write_headers() points its canonical back.
    if has_markdown(page):
        out["markdown"] = out["path"] + "index.md"
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

def check_prose(experience: dict, code: str = DEFAULT_LOCALE) -> None:
    """Fail the build if a bullet is not a string.

    YAML reads `- Some label: some text` as a one-key MAPPING, not as the
    sentence it looks like. That is easy to introduce (any edit that puts a
    colon-space into an unquoted scalar does it) and impossible to see in the
    source, and what reaches the page is a rendered Python dict:

        {'1Password': 'administer access and policies.'}

    That shipped to the live CV once. It fails the build now instead. The fix is
    always to quote the whole scalar: `- "Some label: some text"`.

    Called once per locale, on the roles AFTER the overlay has been merged in,
    so a translated bullet in data/i18n/<code>.yml is checked too. `code` is
    only used to name the file that has to be fixed: on the default locale the
    fault is in data/experience.yml, on any other it is in either that file or
    the overlay that replaced the entry.
    """
    problems = []
    for role in experience["roles"]:
        for item in role.get("highlights", []) or []:
            if not isinstance(item, str):
                problems.append(f"{role['id']}: highlight is {type(item).__name__}, "
                                f"not str -> {item}")
        for group in role.get("duties", []) or []:
            if not isinstance(group.get("group"), str):
                problems.append(f"{role['id']}: duty group name is not a string")
            for item in group.get("items", []) or []:
                if not isinstance(item, str):
                    problems.append(f"{role['id']}: duty item is "
                                    f"{type(item).__name__}, not str -> {item}")
    if problems:
        where = ("data/experience.yml" if code == DEFAULT_LOCALE
                 else f"data/experience.yml or data/i18n/{code}.yml")
        raise SystemExit(
            f"error: [{code}] {where} has entries YAML parsed as mappings.\n"
            "Quote the whole scalar, e.g. - \"Label: text\".\n  "
            + "\n  ".join(problems))


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

    # links.website is the address the CV, the letter and the JSON-LD print;
    # SITE["base_url"] is the one every canonical names. The same fact in two
    # places, so the build refuses to let them disagree.
    if profile["links"]["website"].rstrip("/") != SITE["base_url"]:
        raise SystemExit(
            f"error: data/profile.yml links.website ({profile['links']['website']}) "
            f"is not SITE['base_url'] ({SITE['base_url']}) in scripts/build.py. "
            "Change both together.")

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

    # What a page title or description may name rather than copy. `roles` is
    # counted here for the same reason the "Engineering roles" stat is: a meta
    # description that spells the number out goes stale the moment a role is
    # added, and nothing fails when it does. See localise_page.
    page_subs = {"headline": profile["headline"], "name": profile["name"],
                 "roles": str(len(experience["roles"]))}

    check_prose(experience, code)

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
        # `count: roles` beats a hand-typed number for the same reason every
        # duration is computed: adding a role to data/experience.yml must not
        # require remembering to bump a counter somewhere else.
        if entry.get("count") == "roles":
            entry["value"] = len(experience["roles"])
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

def make_env(markdown: bool = False) -> Environment:
    """The Jinja environment for the HTML pages, or for everything in templates/md/.

    Markdown renders with autoescaping OFF. With it on, every "&" in the data
    ("Routing & switching", "JDs & Duties") would reach an agent as "&amp;",
    in the one copy that is meant to be clean. Nothing rendered this way is
    served as HTML: it goes out as .md or .txt under X-Content-Type-Options:
    nosniff, so a browser never gets to reinterpret it, or into the corpus JSON.
    """
    return Environment(
        loader=FileSystemLoader(ROOT / "templates"),
        autoescape=not markdown,
        undefined=StrictUndefined,   # a typo in a template fails the build
        trim_blocks=True,
        lstrip_blocks=True,
    )


def tidy_markdown(text: str) -> str:
    """Collapse the blank lines Jinja leaves where an {% if %} came out false.

    Invisible in HTML, but in markdown a run of empty lines is noise that an
    agent pays for by the token. One blank line between blocks, trailing
    spaces gone (nothing here relies on them for a line break), one newline at
    the end.
    """
    lines = [line.rstrip() for line in text.splitlines()]
    return re.sub(r"\n{3,}", "\n\n", "\n".join(lines)).strip("\n") + "\n"


def template_values(context: dict) -> dict:
    """The context minus build.py's private keys (the `_misses` report)."""
    return {k: v for k, v in context.items() if not k.startswith("_")}


def render() -> dict:
    """Render every page, and its markdown twin, in every locale.

    Returns the per-locale miss report.
    """
    env = make_env()
    md_env = make_env(markdown=True)

    report = {}
    for locale in LOCALES:
        context = build_context(locale)
        prefix = locale["prefix"].lstrip("/")
        subs = context["page_subs"]
        env.filters["month"] = md_env.filters["month"] = context["month_filter"]
        pages = twins = 0
        for page in PAGES:
            localised = localise_page(page, load_i18n(locale["code"]),
                                      locale["prefix"], subs)
            out = f"{prefix}/{page['out']}" if prefix else page["out"]
            target = OUT / out
            target.parent.mkdir(parents=True, exist_ok=True)
            values = dict(page=localised, alternates=alternates_for(page),
                          **template_values(context))
            target.write_text(env.get_template(page["template"]).render(**values),
                              encoding="utf-8")
            pages += 1
            # The twin gets exactly the values the page got, so a /nl/ twin
            # comes out of the same translation as the /nl/ page and cannot
            # say anything the page does not.
            if localised.get("markdown"):
                twin = md_env.get_template(markdown_template(page)).render(**values)
                (OUT / localised["markdown"].lstrip("/")).write_text(
                    tidy_markdown(twin), encoding="utf-8")
                twins += 1
        report[locale["code"]] = sorted(context["_misses"])
        print(f"  {locale['code']}: {pages} pages, {twins} markdown twins -> {prefix or '/'}")
    return report


def copy_static() -> None:
    """Copy the byte-for-byte files: assets/ and the few root files that ship.

    llms.txt is not one of them any more: it is generated from data/ by
    write_agent_files(), because a hand-written copy had already drifted.
    """
    shutil.copytree(ROOT / "assets", OUT / "assets",
                    ignore=shutil.ignore_patterns(".DS_Store", "__pycache__"))
    for name in ("robots.txt", "favicon.ico", ".nojekyll", "_headers", "_redirects"):
        src = ROOT / name
        if src.exists():
            shutil.copy2(src, OUT / name)
    wellknown = ROOT / ".well-known"
    if wellknown.is_dir():
        shutil.copytree(wellknown, OUT / ".well-known")


def count_header_rules(text: str) -> int:
    """A rule is a line that starts at column 0 and is not a comment."""
    return sum(1 for line in text.splitlines()
               if line.strip() and not line[0].isspace() and not line.startswith("#"))


#: What a locale's home page advertises to an agent in its Link header, beside its
#: markdown twin: the two catalogs in .well-known/ that point at the MCP server, and
#: llms.txt. isitagentready.com (the scan behind Cloudflare's Agent Readiness page)
#: reads the home page's headers for exactly these.
HOME_LINKS = ('</.well-known/api-catalog>; rel="api-catalog", '
              '</.well-known/ai-catalog.json>; rel="ai-catalog"; type="application/ai-catalog+json", '
              '</llms.txt>; rel="describedby"; type="text/plain"')


def write_headers() -> tuple[int, int]:
    """Append the Link headers that pair every page with its markdown twin.

    On the twin, a canonical Link back to its page. A twin is the same content
    as its page, so without it a search engine sees two copies of every page and
    may rank the plain one, and a text file has no <head> to say so in.

    On the page, an alternate Link to its twin plus `Vary: Accept`. The HTML
    <head> already names the twin, but an agent reads headers before it parses
    anything, and a Transform Rule on the zone (not in this repo) rewrites a
    request that asks for `Accept: text/markdown` to the twin, so the same URL
    answers two ways and caches have to know that.

    Generated rather than written into _headers because the set is PAGES x
    LOCALES: a page or locale added here gets its rules without anyone
    remembering to add them there.

    Returns (rules appended, rules in total).
    """
    rules = []
    for loc in LOCALES:
        for page in PAGES:
            twin = localise_page(page, {}, loc["prefix"])
            if twin.get("markdown"):
                rules.append(f"{twin['markdown']}\n"
                             f"  Link: <{SITE['base_url']}{twin['path']}>; rel=\"canonical\"\n")
                links = f'<{twin["markdown"]}>; rel="alternate"; type="text/markdown"'
                if twin["path"] == loc["prefix"] + "/":
                    links += ", " + HOME_LINKS
                rules.append(f"{twin['path']}\n  Link: {links}\n  Vary: Accept\n")
    target = OUT / "_headers"
    with target.open("a", encoding="utf-8") as fh:
        fh.write("\n# Appended by scripts/build.py (write_headers): each markdown twin\n"
                 "# names its page as canonical, and each page names its twin as an\n"
                 "# alternate. Edit the generator, not this.\n")
        fh.write("\n".join(rules))
    total = count_header_rules(target.read_text(encoding="utf-8"))
    # Better a red build than finding out in production what Cloudflare does
    # with rule 101.
    if total > HEADERS_RULE_LIMIT:
        raise SystemExit(f"error: dist/_headers has {total} rules; Cloudflare applies "
                         f"at most {HEADERS_RULE_LIMIT}.")
    return len(rules), total


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


# ── files for assistants ────────────────────────────────────────────────────
#
# /llms.txt, /llms-full.txt and the MCP corpus. All three are renderings of
# data/ like everything else, through templates/md/ and the same macros as the
# markdown twins, so none of them can describe a role differently from the page.

def source_commit() -> str:
    """The commit the corpus was built from: GITHUB_SHA in CI, else HEAD, else ''."""
    sha = os.environ.get("GITHUB_SHA", "").strip()
    if sha:
        return sha
    try:
        return subprocess.run(["git", "rev-parse", "HEAD"], cwd=ROOT, check=True,
                              capture_output=True, text=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return ""


def first_paragraph(text: str, limit: int = 320) -> str:
    """The first block of prose under the title, as plain text, for a search result."""
    for block in re.split(r"\n\s*\n", text):
        if not block.strip() or block.lstrip().startswith("#"):
            continue
        plain = re.sub(r"^\s*[-*] ", "", block, flags=re.M)       # list markers
        plain = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", plain)    # [text](url) -> text
        plain = re.sub(r"<(https?://[^>]+)>", r"\1", plain)       # <url> -> url
        plain = " ".join(plain.replace("`", "").split())
        if len(plain) > limit:
            plain = plain[:limit - 1].rsplit(" ", 1)[0].rstrip(",.;:") + "…"
        return plain
    return ""


def corpus_entries(roles: list[dict]) -> list[dict]:
    """CORPUS with `each: role` expanded into one entry per role, newest first."""
    entries = []
    for spec in CORPUS:
        if spec.get("each") != "role":
            entries.append(dict(spec))
            continue
        for role in roles:
            entries.append({"path": spec["path"].format(id=role["id"]),
                            "template": spec["template"],
                            "url": spec["url"].format(id=role["id"]),
                            "role": role})
    return entries


def check_anchor(url: str) -> None:
    """Fail the build if a corpus URL names an anchor its built page does not have.

    Agents cite these URLs. A renamed role id, or a section id changed in a
    template, would otherwise leave them citing a link that opens at the top
    of the page instead of at the answer, and nothing would notice.
    """
    path, _, anchor = url.removeprefix(SITE["base_url"]).partition("#")
    if not anchor:
        return
    page = OUT / path.lstrip("/") / "index.html"
    if f'id="{anchor}"' not in page.read_text(encoding="utf-8"):
        raise SystemExit(f"error: corpus URL {url} names #{anchor}, which "
                         f"{page.relative_to(ROOT)} does not have.")


def write_agent_files() -> dict:
    """Write dist/llms.txt, dist/llms-full.txt and the MCP corpus.

    English only, as llmstxt.org expects of a root llms.txt. The corpus is
    English for a different reason: an index holding the same CV twice in two
    languages splits every match between two copies of one fact. The Dutch
    site stays reachable through its own twins and a line in llms.txt.

    Runs after render(), because check_anchor reads the built pages.
    """
    locale = next(loc for loc in LOCALES if loc["code"] == DEFAULT_LOCALE)
    context = build_context(locale)
    env = make_env(markdown=True)
    env.filters["month"] = context["month_filter"]
    values = template_values(context)
    values["md_pages"] = [
        localise_page(p, load_i18n(DEFAULT_LOCALE), locale["prefix"], context["page_subs"])
        for p in PAGES if has_markdown(p)
    ]

    for name in ("llms.txt", "llms-full.txt"):
        text = env.get_template(f"md/{name}").render(**values)
        (OUT / name).write_text(tidy_markdown(text), encoding="utf-8")

    entries = corpus_entries(context["roles"])
    # So a document can name the others by the path an agent hands to read_doc,
    # without a template keeping its own copy of CORPUS.
    role_docs = {e["role"]["id"]: e["path"] for e in entries if "role" in e}
    corpus_paths = [e["path"] for e in entries if "role" not in e]
    docs = []
    for entry in entries:
        url = SITE["base_url"] + entry["url"]
        check_anchor(url)
        text = tidy_markdown(env.get_template(entry["template"]).render(
            role=entry.get("role"), role_docs=role_docs, corpus_paths=corpus_paths,
            **values))
        title = text.partition("\n")[0]
        if not title.startswith("# "):
            raise SystemExit(f"error: {entry['template']} must open with a '# Title' line.")
        docs.append({
            "repo": "website",
            "path": entry["path"],
            "title": title[2:].strip(),
            "headings": re.findall(r"^#{2,3} (.+)$", text, flags=re.M),
            "snippet": first_paragraph(text),
            "url": url,
            "text": text,
            "bytes": len(text.encode("utf-8")),
        })

    corpus = {
        "schema": 1,
        "repo": "website",
        "private": False,
        "site_url": SITE["base_url"] + "/",
        # Day precision, from the date every duration and the sitemap's lastmod
        # are computed from. A clock time would make two builds of one commit
        # differ when nothing in them had changed.
        "generated": f"{context['build_date']}T00:00:00Z",
        "commit": source_commit(),
        "docs": docs,
    }
    CORPUS_OUT.parent.mkdir(parents=True, exist_ok=True)
    # Sorted keys and a fixed indent: an unchanged build writes identical bytes,
    # so a diff between two corpora is only ever what actually changed.
    CORPUS_OUT.write_text(
        json.dumps(corpus, sort_keys=True, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8")
    return {"docs": len(docs), "bytes": CORPUS_OUT.stat().st_size}


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
    appended, rules = write_headers()
    write_sitemap(dt.date.today().isoformat())
    corpus = write_agent_files()

    count = sum(1 for p in OUT.rglob("*") if p.is_file())
    print(f"Built {count} files into dist/ across {len(LOCALES)} locales")
    print(f"  _headers: {rules} of {HEADERS_RULE_LIMIT} rules "
          f"({appended} generated for the markdown twins)")
    print(f"  {CORPUS_OUT.relative_to(ROOT)}: {corpus['docs']} documents, "
          f"{corpus['bytes']} bytes")

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
