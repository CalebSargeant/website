{#
  experience/<role id>.md: one role in full, rendered once per role. The first
  paragraph is what a search result shows, so it says what, where and when
  before the summary.
#}
{% import "md/_macros.md" as md with context %}
# {{ role.title }}, {{ role.company }}

{{ role.title }} at {{ role.company }}, {{ role.start_label }} to {{ 'present' if role.is_current else role.end_label }} ({{ role.duration }}). {{ role.summary }}

{{ md.role_facts(role) }}
{{ md.role_detail(role, 2) }}
