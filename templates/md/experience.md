{#
  Markdown twin of experience.html, written to /experience/index.md and
  /nl/experience/index.md: every role, newest first, with its summary,
  highlights, stack and full duty list.
#}
{% import "md/_macros.md" as md with context %}
# {{ page.title }}

> {{ t('md.header', url='<' ~ md.abs(page.path) ~ '>') }}

{{ t('experience.lead', years=years_experience, roles=roles | length) }}

{{ t('experience.duties_note', link=md.link(t('download.jds_link'), md.abs(pdfs.jds))) }}

{{ md.link(t('download.jds_link'), md.abs(pdfs.jds)) }} · {{ md.link(t('download.cv_link'), md.abs(pdfs.cv)) }}

{% for role in roles %}
## {{ role.title }}, {{ role.company }}

{{ md.role_line(role) }}

{{ role.summary }}

{{ md.role_detail(role, 3) }}
{% endfor %}
