{#
  Markdown twin of contact.html, written to /contact/index.md and
  /nl/contact/index.md: every way to reach Caleb, and the three documents.
#}
{% import "md/_macros.md" as md with context %}
# {{ page.title }}

> {{ t('md.header', url='<' ~ md.abs(page.path) ~ '>') }}

{{ t('contact.lead') }}

{% if profile.availability.show %}
{% set state_labels = {
     "open": t('contact.state.open'),
     "selective": t('contact.state.selective'),
     "closed": t('contact.state.closed')
   } %}
{{ state_labels.get(profile.availability.state, t('contact.state.unknown')) }}: {{ profile.availability.text }}

{% endif %}
## {{ t('contact.direct') }}

{{ md.contact_direct() }}
## {{ t('footer.elsewhere') }}

{{ t('contact.elsewhere_note') }}

{{ md.profile_links() }}
## {{ t('contact.documents') }}

{{ t('contact.documents_note') }}

{{ md.documents() }}
