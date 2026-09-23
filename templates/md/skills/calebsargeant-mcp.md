{#
  /.well-known/agent-skills/calebsargeant-mcp/SKILL.md: an Agent Skill for
  connecting to the MCP server and choosing between its tools. The endpoint
  and the site's links come from data/profile.yml; the document list comes
  from the corpus build.py has just written (`corpus_docs`), so the paths it
  tells an agent to hand to read_doc are the paths the server holds. The tool
  names and what they take describe the server (CalebSargeant/mcp), which is
  why they are written here rather than in data/.

  Same front-matter rule as caleb-sargeant-profile.md: one line, no colon
  followed by a space, and build.py fails the build if it does not parse.
#}
{% import "md/_macros.md" as md with context %}
---
name: calebsargeant-mcp
description: Connect an MCP client to {{ profile.name }}'s public, read-only MCP server at {{ profile.links.mcp }} and choose between its four tools (get_profile, search_docs, read_doc, list_docs) to search his CV, website and technical docs. Use it when adding the server to Claude Code, Claude or another MCP client, or when deciding which of its tools to call.
---

# {{ profile.name }}'s MCP server

{{ profile.links.mcp }} is a public, read-only MCP server over two sources: this website and CV ({{ md.abs('/') }}) and {{ profile.name }}'s technical documentation ({{ profile.links.docs }}), which holds how-to guides, runbooks and study notes on networking, security, cloud, Linux, Kubernetes and automation. Every answer cites the published page it came from.

## Connect

- Endpoint: `{{ profile.links.mcp }}`. The hostname is the endpoint.
- Transport: Streamable HTTP, JSON-RPC 2.0 over POST, with JSON responses. It keeps no session.
- Claude Code: `claude mcp add --transport http calebsargeant {{ profile.links.mcp }}`
- Claude on the web, desktop or mobile: add a custom connector with the same URL.
- Any other client: its Streamable HTTP transport, with the same URL.

Before connecting, the {{ md.link('server card', profile.links.mcp ~ 'server-card') }} gives the server's name, endpoint and protocol versions, and the {{ md.link('AI catalog', md.abs('/.well-known/ai-catalog.json')) }} and {{ md.link('API catalog', md.abs('/.well-known/api-catalog')) }} list it for clients that discover tools per domain.

## Signing in is optional

The tools answer without authentication. A client that wants to sign in can, and {{ md.abs('/auth.md') }} describes how.

## Tools

| Tool | Takes | Use it for |
| --- | --- | --- |
| `get_profile` | nothing | Start here for anything about {{ profile.name }} himself: headline, location, current roles, summary, key skills, availability, contact and profiles, in one call. |
| `search_docs` | `query`; optional `repo` and `limit` (1 to 20, default 8) | Searching both sources. A few precise words beat a sentence: technology, product, employer and heading names rank best. `repo` is `website` for the CV or `docs` for the documentation. |
| `read_doc` | `path`; optional `repo` | The full text of one document, by the path `search_docs` or `list_docs` reported, or by the page's URL on either site. Long documents are clipped, and the reply carries the URL to read the rest at. |
| `list_docs` | optional `repo` | The inventory of what each source holds, to check whether a topic is covered before searching. |

All four are read-only. A good sequence is `get_profile` for context, `search_docs` for the question, then `read_doc` on the best match, citing the URL it returns.

## What the website source holds

The website source (`repo` set to `website`) holds these documents, generated from the same data as the pages. The path is what `read_doc` takes; the URL is the page to cite. Read `profile.md` first.

{% for doc in corpus_docs %}
- `{{ doc.path }}`: {{ doc.title }}. {{ doc.url }}
{% endfor %}

## Without MCP

The same content is published over plain HTTPS: {{ md.link('llms.txt', md.abs('/llms.txt')) }}, {{ md.link('llms-full.txt', md.abs('/llms-full.txt')) }}, and a markdown copy of every page at its URL plus `index.md`. The `caleb-sargeant-profile` skill says which of them answers what.
