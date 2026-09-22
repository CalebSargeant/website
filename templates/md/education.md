{#
  Markdown twin of education.html, written to /education/index.md and
  /nl/education/index.md: what is being studied now, every credential with
  its subjects, and every course.
#}
{% import "md/_macros.md" as md with context %}
# {{ page.title }}

> {{ t('md.header', url='<' ~ md.abs(page.path) ~ '>') }}

{# Counted off `kind`, as on the page: the list also holds the school-leaving
   certificate, which is neither a certification nor a qualification. #}
{% set credentials = education | rejectattr('kind', 'equalto', 'schooling') | list %}
{{ t('education.lead', credentials=credentials | length, courses=courses | length) }}

{{ t('education.verify_note', link=md.link('Credly', profile.links.credly)) }}

{{ md.link(t('education.verify_cta'), profile.links.credly) }} · {{ md.link(t('download.cv_link'), md.abs(pdfs.cv)) }}

{% if in_progress %}
## {{ t('common.currently_studying') }}

{{ t('education.studying_note', count=in_progress | length) }}

{% for topic in in_progress %}
- {{ topic }}
{% endfor %}

{% endif %}
## {{ t('education.credentials_title') }}

{{ t('education.credentials_note') }}

{% for item in education %}
{{ md.education_entry(item, 3) }}
{% endfor %}
## {{ t('education.training_title') }}

{{ t('education.training_note', link=md.link('Udemy', profile.links.udemy)) }}

{% for course in courses %}
{{ md.course_line(course) }}
{% endfor %}
