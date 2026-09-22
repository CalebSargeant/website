{#
  Markdown twin of cv.html, written to /cv/index.md and /nl/cv/index.md: the
  CV as it reads on screen, highlights only. The full duty lists live on the
  experience twin, as they do on the site.
#}
{% import "md/_macros.md" as md with context %}
{# Display form of a link, the same trim cv.html makes. #}
{% macro short_url(url) -%}
{{ url.replace("https://", "").replace("www.", "").rstrip("/") }}
{%- endmacro %}
# {{ page.title }}

> {{ t('md.header', url='<' ~ md.abs(page.path) ~ '>') }}

{{ md.link(t('cta.download_pdf'), md.abs(pdfs.cv)) }} · {{ t('cv.generated_on', date=build_date) }}

## {{ profile.name }}

{{ profile.headline }}

- {{ md.link(profile.contact.email, 'mailto:' ~ profile.contact.email) }}
- {{ md.link(profile.contact.phone, 'tel:' ~ profile.contact.phone_href) }}
- {{ profile.location }}
- {{ md.link(short_url(profile.links.website), profile.links.website) }}
- {{ md.link(short_url(profile.links.github), profile.links.github) }}
- {{ md.link(short_url(profile.links.linkedin), profile.links.linkedin) }}

{{ profile.nationality_note }}

## {{ t('cv.section.profile') }}

{{ profile.summary }}

## {{ t('cv.section.skills') }}

{% for skill in cv_skills %}
- {{ skill.name }}{{ ' · ' ~ t('common.years_short', n=skill.years) if skill.get('years') else '' }}
{% endfor %}

{{ t('cv.also') }}: {{ soft_skills | join(', ') }}

## {{ t('experience.title') }}

{{ t('cv.experience_note',
     roles=roles | length, year=(roles | last).start_year,
     page_link=md.link(t('cv.experience_page_link'), md.abs(url('/experience/'))),
     pdf_link=md.link(t('cv.jds_pdf_link'), md.abs(pdfs.jds))) }}

{% for role in roles %}
### {{ role.title }}, {{ role.company }}

{{ role.start_short }} {{ t('common.to') }} {{ role.end_short }} · {{ role.duration }}{{ ' · ' ~ t('common.current') if role.is_current else '' }}

{{ role.location }} · {{ role.type }}{{ ' · ' ~ role.location_note if role.get('location_note') else '' }}

{{ role.summary }}

{% for line in role.highlights %}
- {{ line }}
{% endfor %}

{# The role's own focus tags, not the toolbar's four: the set is open, as
   cv.html says. #}
{{ t('md.focus') }}: {{ role.focus | join(', ') }} · {{ md.link(t('cv.full_duties'), md.abs(url('/experience/')) ~ '#' ~ role.id) }}

{% endfor %}
## {{ t('cv.section.education') }}

{% for item in featured_education %}
{{ md.education_line(item) }}
{% endfor %}

{% if in_progress %}
{{ t('education.in_progress') }}: {{ in_progress | join(', ') }}

{% endif %}
{% set other_education = education | reject("in", featured_education) | list %}
{% if other_education %}
{{ t('common.everything_else', count=other_education | length) }}:

{% for item in other_education %}
{{ md.education_line(item) }}
{% endfor %}

{% endif %}
## {{ t('education.training_title') }}

{% for course in featured_courses %}
{{ md.course_line(course) }}
{% endfor %}

{% set other_courses = courses | reject("in", featured_courses) | list %}
{% if other_courses %}
{{ t('common.everything_else', count=other_courses | length) }}:

{% for course in other_courses %}
{{ md.course_line(course) }}
{% endfor %}

{% endif %}
## {{ t('cv.section.interests') }}

{{ profile.interests | join(', ') }}

## {{ t('cv.colophon_kicker') }}

{{ t('cv.colophon_body', path='`data/`') }}

{{ t('cv.colophon_built', date=build_date, link=md.link('GitHub', site.repo)) }}
