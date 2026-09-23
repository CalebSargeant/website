# Template contract

What `scripts/build.py` hands every template, and the shape `base.html` expects
its children to take. Jinja runs with `StrictUndefined`, so referencing anything
not listed here fails the build rather than rendering an empty string.

## Globals (every page)

| Name | Shape |
| --- | --- |
| `site` | `{base_url, name, repo}`. `base_url` is the apex, `https://calebsargeant.com`, with no trailing slash |
| `page` | the current entry from `PAGES`, localised: `{id, template, out, path, href, title, description}`, plus optional `nav`, `print`, `sitemap`, and `markdown` (the twin's path, e.g. `/nl/experience/index.md`) on pages in the sitemap only. `path` already carries the locale prefix |
| `alternates` | this page in every locale: `[{code, native, html_lang, url, path}]`, for hreflang and the switcher |
| `locale` | the locale being rendered: `{code, prefix, html_lang, native, og}` |
| `locales`, `default_locale` | every locale record, and the default's code (`"en"`) |
| `t` | `t('key', **fmt)`: an interface string from `data/i18n/<code>.yml`, English on a miss, a failed build for a key English does not define |
| `url` | `url('/cv/')` → the path with the locale prefix (`/nl/cv/`); anything not starting with `/` is returned unchanged |
| `page_subs` | what `{name}`, `{headline}` and `{roles}` in a page title or description are replaced with |
| `nav` | list of page dicts that have a `nav` label: build the header from this |
| `profile` | all of `data/profile.yml`, with `profile.stats[].value` already computed |
| `roles` | all roles, newest first, each enriched (see below) |
| `current_roles` | the subset with `end: present` |
| `education` | `data/education.yml` `education:`, newest first, each with `completed_label` |
| `featured_education` | the `featured: true` subset |
| `in_progress` | list of strings: what is being studied now |
| `courses` | newest first, each with `date_label` |
| `featured_courses` | the `featured: true` subset |
| `skill_groups` | `data/skills.yml` `groups:` verbatim |
| `soft_skills` | list of strings |
| `cv_skills` | flattened list of every skill with `cv: true` |
| `focus_areas` | `["platform", "cloud", "network", "security"]` |
| `pdfs` | `{cv, jds, cover}`: absolute paths to the generated PDFs |
| `today` | `datetime.date` |
| `build_date` | ISO date string |
| `career_start_year` | int: the year the oldest role starts |
| `years_experience` | int: completed years since that role's start month |

Filter: `{{ some_date | month }}` → `"May 2024"`; `{{ d | month(short=True) }}` → `"May 2024"` with a 3-letter month.

## Enriched role fields

On top of everything in `data/experience.yml`:

`is_current`, `start_label` / `end_label` (`"June 2025"` / `"Present"`),
`start_short` / `end_short`, `duration` (`"2 yr 8 mo"`), `start_year`,
`duties` (resolved: a role using `duties_see` already has the other role's
list, plus `duties_shared_with` naming the company it came from).

## base.html contract

`templates/base.html` owns `<!doctype>`, `<head>`, the header, the footer, the
command-palette markup and the script tags. Child templates override blocks:

```jinja
{% extends "base.html" %}
{% block body_class %}page-home{% endblock %}
{% block head %}   {# optional: extra <link>/<script type=ld+json> #}{% endblock %}
{% block content %} ... {% endblock %}
{% block scripts %} {# optional: page-specific <script> #}{% endblock %}
```

`base.html` derives `<title>` and `<meta name="description">` from `page`, so a
child never sets them. It also emits `<link rel="alternate" type="text/markdown">`
when `page.markdown` is set, and loads `assets/webmcp.js` with a `data-contact`
JSON attribute built from `profile` (single-quoted, because `tojson` leaves `"`
unescaped; see `docs/design-system.md` section 3 for its keys). Print templates do **not** extend `base.html`: they
are standalone documents that link only `assets/print.css`.

## Markdown templates (`templates/md/`)

Everything under `templates/md/` is rendered by a second environment with
**autoescape off** (`make_env(markdown=True)`), then `tidy_markdown` collapses
blank-line runs. Same `StrictUndefined`, same `trim_blocks`, so a `{% if %}` at
the end of a line eats that line's newline: write line-end conditions as
`{{ x if y else '' }}`. Never render these with the HTML environment, and never
serve them as HTML.

| Template | Output | Context |
| --- | --- | --- |
| `md/<page>.md` (`home`, `experience`, `education`, `cv`, `contact`) | `<page.path>index.md` in every locale | exactly what the HTML page gets, `page` and `alternates` included |
| `md/llms.txt`, `md/llms-full.txt` | `dist/llms.txt`, `dist/llms-full.txt` | the English globals, plus `md_pages`: every localised page that has a twin, and `corpus_urls`: `{corpus path: URL path}` for the single corpus documents (`profile.md` -> `/`), which is where llms-full.txt's `Page:` lines come from |
| `md/skills/<name>.md` | `dist/.well-known/agent-skills/<name>/SKILL.md`, listed in `index.json` there | the same as llms.txt, plus `corpus_docs`: `[{path, title, url}]` for every corpus document, as the corpus was just written |
| `md/corpus/*.md` | the documents in `.docs-index/index/website.json` | the English globals, plus `role` (the enriched role for `corpus/role.md`, else `None`), `role_docs` (`{role id: corpus path}`) and `corpus_paths` (the other documents' paths) |

A page in the sitemap must have a twin template of the same name, or the build
fails with `TemplateNotFound`. Every corpus document must open with `# Title`:
that line becomes the document's `title`. Every skill must open with YAML front
matter whose `name` is its `SKILLS` row's and whose `description` is one line of
at most 1024 characters with no colon followed by a space; the build parses it and
fails on anything else.

`md/_macros.md` is imported `with context`: `abs`, `link`, `h`, `role_line`,
`role_detail`, `role_facts`, `education_entry`, `education_line`,
`course_line`, `skill_group`, `stats`, `contact_direct`, `profile_links`,
`documents`. Every label in them goes through `t()`, except `role_facts`, which
only the English-only files use.
