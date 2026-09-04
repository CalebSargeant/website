# Template contract

What `scripts/build.py` hands every template, and the shape `base.html` expects
its children to take. Jinja runs with `StrictUndefined`, so referencing anything
not listed here fails the build rather than rendering an empty string.

## Globals (every page)

| Name | Shape |
| --- | --- |
| `site` | `{base_url, name, repo}` |
| `page` | the current entry from `PAGES`: `{id, template, out, path, title, description}`, plus optional `nav`, `print`, `sitemap` |
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
child never sets them. Print templates do **not** extend `base.html`: they are
standalone documents that link only `assets/print.css`.
