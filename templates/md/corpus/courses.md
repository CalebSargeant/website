{#
  courses.md: every course and piece of vendor training, newest first.
#}
{% import "md/_macros.md" as md with context %}
# {{ t('education.training_title') }}

The {{ courses | length }} courses {{ profile.name }} has completed, vendor training included, newest first. {{ t('education.training_note', link=md.link('Udemy', profile.links.udemy)) }}

{% for course in courses %}
{{ md.course_line(course) }}
{% endfor %}
