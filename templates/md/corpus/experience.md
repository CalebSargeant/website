{#
  experience.md: the whole career on one screen, one line per role, newest
  first. Each line names the role's own document, which is the path to hand
  read_doc for the highlights and the full duty list.
#}
{% import "md/_macros.md" as md with context %}
# {{ t('experience.title') }}

{{ profile.name }} has held {{ roles | length }} engineering roles since {{ career_start_year }} ({{ years_experience }} years in IT), {{ current_roles | length }} of them current. Newest first, one line each; every role also has its own document with its highlights, stack and full duty list.

{% for role in roles %}
- {{ role.start_label }} to {{ 'present' if role.is_current else role.end_label }} ({{ role.duration }}): {{ md.link(role.title ~ ', ' ~ role.company, md.abs('/experience/#' ~ role.id)) }}, {{ role.location }}, {{ role.type }}. `{{ role_docs[role.id] }}`
{% endfor %}
