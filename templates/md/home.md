{#
  Markdown twin of home.html, written to /index.md and /nl/index.md. Same
  values, same catalogue strings, same order as the page, none of the chrome
  (canvas, filters, meters, palette). Rendered with autoescape off: see
  make_env in scripts/build.py.
#}
{% import "md/_macros.md" as md with context %}
# {{ page.title }}

> {{ t('md.header', url='<' ~ md.abs(page.path) ~ '>') }}

**{{ t('hero.title_before') }} {{ t('hero.title_accent') }}**

{# The same two-sentence trim of the one summary that home.html makes. #}
{{ profile.summary.split('. ')[:2] | join('. ') }}.

- {{ profile.headline }}, {{ profile.location }}
- {{ t('hero.term.years', years=years_experience, start=career_start_year) }}
{% if profile.availability.show %}
- {{ profile.availability.text }}
{% endif %}

{{ md.link(t('cta.view_cv'), md.abs(url('/cv/'))) }} · {{ md.link(t('cta.download_pdf'), md.abs(pdfs.cv)) }} · {{ md.link('GitHub', profile.links.github) }}

{{ md.stats() }}
## {{ t('now.title') }}

{{ t('now.lead') }}

{% for role in current_roles %}
### {{ role.title }}, {{ role.company }}

{{ t('now.range_present', start=role.start_label) }} · {{ role.duration }} · {{ role.type }} · {{ role.location }}

{{ role.summary }}

{% if role.stack %}
{{ t('md.stack') }}: {{ role.stack[:8] | join(', ') }}

{% endif %}
{% endfor %}
{% if in_progress %}
{{ t('common.currently_studying') }}: {{ in_progress | join(', ') }}

{% endif %}
## {{ t('whatdo.title') }}

{{ t('whatdo.lead') }}

{% for area in focus_areas %}
### {{ t('whatdo.' ~ area ~ '.title') }}

{{ t('whatdo.' ~ area ~ '.body') }}

{% endfor %}
## {{ t('skills.title') }}

{{ t('skills.lead') }}

{% for group in skill_groups %}
{{ md.skill_group(group, 3) }}
{% endfor %}
{{ t('skills.soft_kicker') }}: {{ soft_skills | join(', ') }}

## {{ t('career.title') }}

{{ t('career.lead', roles=roles | length, year=roles[-1].start_year) }}

{% for role in roles[:4] %}
### {{ role.title }}, {{ role.company }}

{{ role.start_short }} {{ t('common.to') }} {{ role.end_short }} · {{ role.duration }} · {{ role.location }}

{{ role.summary }}

{% endfor %}
{{ md.link(t('career.all_roles', roles=roles | length), md.abs(url('/experience/'))) }} · {{ md.link(t('career.certs_link'), md.abs(url('/education/'))) }}

## {{ t('cta.title') }}

{{ profile.availability.text }} {{ t('cta.lead') }}

- {{ md.link(t('cta.book_call'), profile.links.booking) }}
- {{ md.link(profile.contact.email, 'mailto:' ~ profile.contact.email) }}
- {{ md.link(profile.contact.phone, 'tel:' ~ profile.contact.phone_href) }}
- {{ md.link(t('download.cv_pdf'), md.abs(pdfs.cv)) }}
- {{ md.link(t('download.jds_pdf'), md.abs(pdfs.jds)) }}
- {{ md.link(t('download.cover_pdf'), md.abs(pdfs.cover)) }}
