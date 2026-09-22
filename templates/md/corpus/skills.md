{#
  skills.md: every skill by area with its level and years, and the soft
  skills. The level scale is the site's own, quoted from the catalogue.
#}
{% import "md/_macros.md" as md with context %}
# {{ t('skills.kicker') }}

{{ profile.name }}'s technical skills in {{ skill_groups | length }} areas ({{ skill_groups | map(attribute='name') | join(', ') }}), each rated from 1 to 5 with the years in use.

{{ t('skills.lead') }}

{% for group in skill_groups %}
{{ md.skill_group(group, 2) }}
{% endfor %}
## Soft skills

{% for item in soft_skills %}
- {{ item }}
{% endfor %}
