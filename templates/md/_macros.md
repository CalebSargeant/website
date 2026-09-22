{#
  Shared fragments for everything in templates/md/: the markdown twins of the
  pages, llms.txt, llms-full.txt and the MCP corpus. One definition of how a
  role, a credential or a skill reads as markdown, so the twin, the full file
  and the corpus cannot describe the same role three ways.

  Labels go through t(), so the same line gives English in the corpus and
  Dutch in a /nl/ twin. Import this `with context`, which is what lets a macro
  see t, site, pdfs and profile without having them passed in.

  `level` is the heading level of a fragment's own headings (2 is "##"): the
  same role sits under an H1 in its corpus document and under an H3 in
  llms-full.txt.

  trim_blocks eats the newline after any {% tag %}, so a condition at the END
  of a line would glue that line to the next. Line-end conditions are written
  as {{ x if y else '' }} expressions instead, which keep their newline.
#}

{# Absolute, always: a twin or a corpus document is read without the page
   around it, so a relative link would resolve against nothing. #}
{% macro abs(path) %}{{ site.base_url }}{{ path }}{% endmacro %}

{% macro link(text, href) %}[{{ text }}]({{ href }}){% endmacro %}

{% macro h(level) %}{{ '#' * level }}{% endmacro %}

{# "June 2025 to Present · 1 yr 3 mo · Netherlands · Permanent", the dated line
   /experience shows on every card. location_note is for the roles that moved
   country part-way through. #}
{% macro role_line(role) -%}
{{ role.start_label }} {{ t('common.to') }} {{ role.end_label }} · {{ role.duration }} · {{ role.location }} · {{ role.type }}{{ ' · ' ~ role.location_note if role.get('location_note') else '' }}
{%- endmacro %}

{# English labels on purpose: only the English-only files (llms-full.txt and
   the corpus) use this. A twin uses role_line, which translates. #}
{% macro role_facts(role) %}
- Dates: {{ role.start_label }} to {{ 'present' if role.is_current else role.end_label }} ({{ role.duration }})
- Location: {{ role.location }}{{ ' (' ~ role.location_note ~ ')' if role.get('location_note') else '' }}
- Type: {{ role.type }}
- Focus: {{ role.focus | join(', ') }}
- Page: {{ abs('/experience/#' ~ role.id) }}
{% endmacro %}

{# Everything /experience shows for a role below its summary, in the same
   order. `duties` is already resolved: a role using duties_see carries the
   other role's list, and duties_shared_with names where it came from.
   group["items"] and not group.items: the dot form is the dict method. #}
{% macro role_detail(role, level) %}
{% if role.highlights %}
{{ h(level) }} {{ t('md.highlights') }}

{% for line in role.highlights %}
- {{ line }}
{% endfor %}

{% endif %}
{% if role.stack %}
{{ h(level) }} {{ t('md.stack') }}

{{ role.stack | join(', ') }}

{% endif %}
{% if role.duties %}
{{ h(level) }} {{ t('md.duties') }}

{% if role.get('duties_shared_with') %}
{{ t('experience.same_duties', company=role.duties_shared_with) }}

{% endif %}
{% for group in role.duties %}
{{ h(level + 1) }} {{ group.group }}

{% for duty in group["items"] %}
- {{ duty }}
{% endfor %}

{% endfor %}
{% endif %}
{% endmacro %}

{# A credential in full, as /education shows it, down to capitalising `kind`
   the way that page does. #}
{% macro education_entry(item, level) %}
{{ h(level) }} {{ item.title }}

{{ item.completed_label }} · {{ item.institution }} · {{ item.kind | capitalize }}{{ ' · ' ~ item.credential if item.get('credential') else '' }}

{% if item.get('national_qualification') %}
{{ t('education.national_qualification', value=item.national_qualification) }}

{% endif %}
{% if item.get('verify') %}
{{ link(t('common.verify'), item.verify) }}

{% endif %}
{% if item.get('subjects') %}
{{ t('education.subjects', count=item['subjects'] | length) }}:

{% for subject in item['subjects'] %}
- {{ subject }}
{% endfor %}

{% endif %}
{% endmacro %}

{# A credential on one line, the way the CV lists them. #}
{% macro education_line(item) -%}
- {{ item.title }} · {{ item.institution }} · {{ item.completed_label }} · {{ item.kind }}{{ ' · ' ~ t('education.national_qualification', value=item.national_qualification) if item.get('national_qualification') else '' }}{{ ' · ' ~ link(t('common.verify'), item.verify) if item.get('verify') else '' }}
{%- endmacro %}

{% macro course_line(course) -%}
- {{ course.date_label }} · {{ course.title }} · {{ course.institution }}{{ ', ' ~ course.location if course.get('location') else '' }} · {{ course.duration }}
{%- endmacro %}

{# The level is the same 1 to 5 the meter on the home page draws. #}
{% macro skill_group(group, level) %}
{{ h(level) }} {{ group.name }}

{% for skill in group.skills %}
- {{ skill.name }}: {{ t('skills.level_aria', level=skill.level) }}{{ ', ' ~ t('common.years_short', n=skill.years) if skill.get('years') else '' }}
{% endfor %}

{% endmacro %}

{% macro stats() %}
{% for stat in profile.stats %}
- {{ stat.label }}: {{ stat.value }}{{ stat.get('suffix', '') }}
{% endfor %}

{% endmacro %}

{# The "Direct" card on /contact. #}
{% macro contact_direct() %}
- {{ t('contact.email') }}: {{ link(profile.contact.email, 'mailto:' ~ profile.contact.email) }}
- {{ t('contact.phone') }}: {{ link(profile.contact.phone, 'tel:' ~ profile.contact.phone_href) }}
- {{ t('contact.location') }}: {{ profile.location }}
- {{ profile.nationality_note }}
- {{ link(t('contact.book_slot'), profile.links.booking) }}

{% endmacro %}

{# The "Elsewhere" card: one sentence per site with its link inside, from the
   same catalogue strings the page uses. #}
{% macro profile_links() %}
- {{ t('contact.link.github', link=link('GitHub', profile.links.github)) }}
- {{ t('contact.link.linkedin', link=link('LinkedIn', profile.links.linkedin)) }}
- {{ t('contact.link.credly', link=link('Credly', profile.links.credly)) }}
- {{ t('contact.link.udemy', link=link('Udemy', profile.links.udemy)) }}
- {{ t('contact.link.docs', link=link(profile.links.docs | replace('https://', '') | trim('/'), profile.links.docs)) }}

{% endmacro %}

{% macro documents() %}
- {{ link(t('download.cv_pdf'), abs(pdfs.cv)) }}: {{ t('contact.doc.cv_note') }}
- {{ link(t('download.jds_pdf'), abs(pdfs.jds)) }}: {{ t('contact.doc.jds_note') }}
- {{ link(t('download.cover_pdf'), abs(pdfs.cover)) }}: {{ t('contact.doc.cover_note') }}

{% endmacro %}
