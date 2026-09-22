{#
  profile.md: who Caleb is, in one document. The one an agent should read
  first, so it answers the common questions (what he does, where, whether he
  can work here, whether he is looking, how to reach him) without a second
  call, and names the documents that go deeper.
#}
{% import "md/_macros.md" as md with context %}
# {{ profile.name }}

{{ profile.name }} is a {{ profile.headline }} based in {{ profile.location }}. {{ profile.tagline }} {{ profile.nationality_note }}.{{ ' ' ~ profile.availability.text if profile.availability.show else '' }}

- Headline: {{ profile.headline }}
- Tagline: {{ profile.tagline }}
- Location: {{ profile.location }}
- Work authorisation: {{ profile.nationality_note }}
{% if profile.availability.show %}
- Availability: {{ profile.availability.text }}
{% endif %}
- Website: {{ md.abs('/') }}

## Summary

{{ profile.summary }}

## Current roles

{% for role in current_roles %}
- {{ role.title }}, {{ role.company }} ({{ role.type }}, {{ role.location }}), since {{ role.start_label }}. {{ role.summary }} In full: `{{ role_docs[role.id] }}`.
{% endfor %}

## Key skills

The skills the CV leads with (`cv: true` in data/skills.yml); `skills.md` has every skill with its level.

{% for skill in cv_skills %}
- {{ skill.name }}
{% endfor %}

## Numbers

{{ md.stats() }}
{% if in_progress %}
## Currently studying

{% for item in in_progress %}
- {{ item }}
{% endfor %}

{% endif %}
## Interests

{% for interest in profile.interests %}
- {{ interest }}
{% endfor %}

## Contact and links

{{ md.contact_direct() }}
{{ md.profile_links() }}
{{ md.documents() }}
## More documents

Every role has its own document, named in `experience.md`. Also: {% for path in corpus_paths if path not in ('profile.md', 'experience.md') %}`{{ path }}`{{ ', ' if not loop.last else '.' }}{% endfor %}
