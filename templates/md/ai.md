{#
  Markdown twin of ai.html, written to /ai/index.md and /nl/ai/index.md: how
  to point an assistant at this site. An assistant reading this is usually the
  one being set up, so the address and the commands come first and verbatim.
#}
{% import "md/_macros.md" as md with context %}
{% set mcp_host = profile.links.mcp | replace('https://', '') | trim('/') %}
{% set mm_mcp_host = profile.links.magmamoose_mcp | replace('https://', '') | trim('/') %}
# {{ page.title }}

> {{ t('md.header', url='<' ~ md.abs(page.path) ~ '>') }}

{{ t('ai.lead') }}

## {{ t('ai.own.title') }}

{{ t('ai.own.body').format(server=md.link(mcp_host, profile.links.mcp)) }}

{{ t('ai.own.address') }}: <{{ profile.links.mcp }}>

## {{ t('ai.nievah.title') }}

{{ t('ai.nievah.body') }}

## {{ t('ai.setup.title') }}

{{ t('ai.setup.lead') }}

### Claude

{{ t('ai.claude.where') }}.

1. {{ t('ai.claude.step1') }}
2. {{ t('ai.claude.step2') }}
3. {{ t('ai.claude.step3') }}
4. {{ t('ai.claude.step4') }}

{{ t('ai.claude.note') }}

### Claude Code

```sh
claude mcp add --transport http calebsargeant {{ profile.links.mcp }}
```

{{ t('ai.claude_code.note') }}

### Codex

{{ t('ai.codex.where') }}.

```sh
codex mcp add calebsargeant --url {{ profile.links.mcp }}
```

{{ t('ai.codex.note') }}

### ChatGPT

{{ t('ai.chatgpt.where') }}. {{ t('ai.chatgpt.body') }}

### {{ t('ai.other.title') }}

{{ t('ai.other.body') }}

## {{ t('ai.prompts.title') }}

{{ t('ai.prompts.lead') }}

{% for key in ['fit', 'kubernetes', 'security', 'certs'] %}
- {{ t('ai.prompt.' ~ key) }}
{% endfor %}

## {{ t('ai.team.title') }}

{{ t('ai.team.body').format(server='`' ~ mm_mcp_host ~ '`') }} {{ md.link(t('ai.team.link'), profile.links.magmamoose_services) }}.
