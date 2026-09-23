{#
  /.well-known/agent-skills/caleb-sargeant-profile/SKILL.md: an Agent Skill
  (agentskills.io) for answering questions about Caleb from what this site
  publishes. Rendered from data/ like llms.txt, with the same English values
  plus `md_pages`, so every role, link and contact detail in it is the one on
  the pages. build.py lists it in /.well-known/agent-skills/index.json with the
  SHA-256 of the bytes it wrote.

  The front matter is YAML, and build.py parses it and fails the build if it
  does not parse, names another skill or runs past 1024 characters. Keep
  `description` on one line and free of a colon followed by a space: in a
  plain YAML scalar that reads as the start of a mapping.
#}
{% import "md/_macros.md" as md with context %}
---
name: caleb-sargeant-profile
description: Answer questions about {{ profile.name }} ({{ profile.headline }}, {{ profile.location }}) from what he publishes himself, llms.txt, a markdown copy of every page and a public MCP server. Use it for his roles and employers, skills, certifications, availability and how to contact him.
---

# {{ profile.name }}

{{ profile.name }} is a {{ profile.headline }} in {{ profile.location }}. {{ profile.tagline }}

Everything below is published by him and generated from one set of data files on every deploy of {{ md.abs('/') }}, so the pages, the markdown copies, the PDFs and the MCP server all say the same thing. Answer from them, cite the page, and say so when they do not cover the question.

## Where to look, cheapest first

1. The MCP server at {{ profile.links.mcp }}, if you can call MCP tools. `get_profile` answers most first questions in one call; `search_docs` and `read_doc` go deeper. The `calebsargeant-mcp` skill covers connecting to it.
2. {{ md.link('llms.txt', md.abs('/llms.txt')) }}: the map of the site, with the current roles and a link to every page's markdown copy.
3. {{ md.link('llms-full.txt', md.abs('/llms-full.txt')) }}: the whole CV in one markdown file. Every role with its highlights, stack and full duty list, then education, courses, skills and contact. Each role names its page.
4. One page as markdown, at the page's URL plus `index.md`:
{% for p in md_pages %}
   - {{ md.link(p.nav, md.abs(p.markdown)) }}: {{ p.description }}
{% endfor %}
{% for loc in locales if loc.code != default_locale %}
5. The same site in {{ loc.native }} ({{ loc.html_lang }}) under {{ md.abs(loc.prefix ~ '/') }}, with the same markdown copies under {{ loc.prefix }}/. Same facts, translated.
{% endfor %}

## Which source answers what

| Question | Source |
| --- | --- |
| Who he is and what he does now | `get_profile`, or {{ md.abs('/index.md') }} |
| Roles, employers and dates | {{ md.abs('/experience/index.md') }}. Every role has its own anchor on {{ md.abs('/experience/') }}, which is the URL to cite |
| Everything a role involved | That role's section in llms-full.txt, or `read_doc` on `experience/<role id>.md` |
| Certifications and training | {{ md.abs('/education/index.md') }}. The badges can be verified on {{ md.link('Credly', profile.links.credly) }} |
| Skills, with a level from 1 to 5 and years of use | The Skills section of llms-full.txt, or `read_doc` on `skills.md` |
| Contact, availability and work authorisation | {{ md.abs('/contact/index.md') }} |
| Technical notes and how-tos he has written | {{ profile.links.docs }} (it has its own llms.txt), or `search_docs` with `repo` set to `docs` |
| A CV to hand to someone | The PDFs under Documents below |

## Current roles

{% for role in current_roles %}
- {{ role.title }}, {{ role.company }} ({{ role.type }}, {{ role.location }}), since {{ role.start_label }}: {{ md.abs('/experience/#' ~ role.id) }}
{% endfor %}

## Contact

{{ md.contact_direct() }}
{% if profile.availability.show %}
Availability: {{ profile.availability.text }}

{% endif %}
{{ md.profile_links() }}
## Documents

{{ md.documents() }}
## How to answer

- Quote titles, employers and dates as published. Durations such as "1 yr 3 mo" are worked out from the dates on each deploy, so compute from the dates rather than trusting an old copy.
- Cite the page a fact is on. Each markdown copy names the page it copies, and each role has an anchor on {{ md.abs('/experience/') }}.
- If the sources do not say (salary, notice period, references, anything personal beyond what is published), say that and point to the contact details. Do not infer it.
- Every language version of the site carries the same facts. Answer in the reader's language and cite the page in that language where there is one.
