{#
  education.md: every certification and qualification, and what is being
  studied now. Courses have their own document.
#}
{% import "md/_macros.md" as md with context %}
{% set credentials = education | rejectattr('kind', 'equalto', 'schooling') | list %}
# {{ t('cv.section.education') }}

{{ profile.name }}'s certifications and qualifications, newest first: {{ credentials | map(attribute='title') | join(', ') }}.

The badges are verifiable on {{ md.link('Credly', profile.links.credly) }}. Each entry below lists the subjects it covered.

{% if in_progress %}
## {{ t('education.in_progress') }}

{% for topic in in_progress %}
- {{ topic }}
{% endfor %}

{% endif %}
## {{ t('education.credentials_title') }}

{% for item in education %}
{{ md.education_entry(item, 3) }}
{% endfor %}
