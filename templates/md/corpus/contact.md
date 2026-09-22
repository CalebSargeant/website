{#
  contact.md: every way to reach Caleb, the profiles elsewhere, and the three
  documents.
#}
{% import "md/_macros.md" as md with context %}
# {{ t('contact.kicker') }}

How to reach {{ profile.name }}: {{ profile.contact.email }}, {{ profile.contact.phone }}, or a slot booked at {{ profile.links.booking }}.{{ ' ' ~ profile.availability.text if profile.availability.show else '' }}

{{ t('contact.lead') }}

## {{ t('contact.direct') }}

{{ md.contact_direct() }}
## {{ t('footer.elsewhere') }}

{{ md.profile_links() }}
## {{ t('contact.documents') }}

{{ t('contact.documents_note') }}

{{ md.documents() }}
