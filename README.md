# calebsargeant.com

**`data/` is the only place a fact about Caleb is written down.** The website, the
CV PDF, the JDs & Duties PDF and the cover letter are all renderings of those five
YAML files. Nothing is typed twice, so nothing can drift: fix a date once and it is
right on the site, in the CV, in the long-form duty record and in the letter.

That is the whole design. Everything else here is plumbing.

```
data/*.yml  ->  scripts/build.py (Jinja2)  ->  dist/  ->  Cloudflare Worker static assets
                                            \
                                             ->  three print sheets  ->  Chromium  ->  PDFs
                                            \
                                             ->  .docs-index/  ->  R2  ->  the MCP server
```

No node build, no framework, no bundler. Plain HTML, one stylesheet for the site,
one for print, and a small amount of progressive-enhancement JavaScript. With JS
off the site is still fully readable and navigable.

## What is here

```
.
├── data/                        THE SOURCE OF TRUTH. Edit here, nowhere else.
│   ├── profile.yml              name, headline, contact, summary, stats, cover-letter copy
│   ├── experience.yml           every role: dates, focus tags, highlights, duties, stack
│   ├── education.yml            certifications and qualifications, plus what is in progress
│   ├── courses.yml              training and courses
│   └── skills.yml               grouped skills with a 1 to 5 level, plus the soft skills
├── templates/
│   ├── base.html                doctype, head, nav, footer, command palette, script tags
│   ├── home.html                the home page
│   ├── experience.html          the timeline, with each role's duties in a <details>
│   ├── education.html           certifications, qualifications and courses
│   ├── cv.html                  the CV on screen, with the focus filter
│   ├── contact.html             email, phone, links, booking
│   ├── 404.html                 served with a real 404 status
│   ├── print/cv.html            A4 sheet, printed to Caleb_Sargeant_CV.pdf
│   ├── print/jds.html           A4 sheet, printed to Caleb_Sargeant_JDs_and_Duties.pdf
│   ├── print/cover.html         A4 sheet, printed to Caleb_Sargeant_Cover_Letter.pdf
│   ├── social/og.html           the 1200x630 Open Graph card, rendered by render_images.py
│   └── md/                      markdown, rendered with autoescape off (see "For assistants")
│       ├── _macros.md           how a role, a credential or a skill reads as markdown
│       ├── home.md, cv.md ...   one twin per page in the sitemap, same names as the pages
│       ├── llms*.txt            /llms.txt and /llms-full.txt
│       └── corpus/              the MCP corpus documents

├── assets/
│   ├── site.css                 every token and component for the site
│   ├── site.js                  reveals, nav, command palette, theme, counters
│   ├── hero-net.js              the hero canvas (network graph), self-pausing
│   ├── print.css                the print stylesheet, used only by templates/print/*
│   ├── img/, og/, favicon*      photo, social card, icons (generated but committed)
│   └── mark.svg
├── scripts/
│   ├── build.py                 the hub: loads data, renders every page, writes dist/
│   ├── render_pdf.py            prints dist/print/* to dist/downloads/*.pdf with Chromium
│   └── render_images.py         regenerates the OG card and the favicons (run rarely)
├── docs/
│   ├── design-system.md         tokens, exact class names, animation catalogue. Normative.
│   └── template-context.md      what build.py hands templates, and base.html's blocks
├── Makefile                     install / build / pdf / serve / clean
├── requirements.txt             jinja2, pyyaml, playwright
├── wrangler.toml                the assets-only Worker and its apex + www routes
├── _headers                     CSP, HSTS, cache policy, charset on text
├── robots.txt · .well-known/security.txt   crawl and disclosure surface
├── .github/workflows/deploy.yml production deploys, the corpus publish, PR previews
├── dist/                        generated. Deleted and rewritten on every build. Not committed.
└── .docs-index/                 generated: the MCP corpus, index/website.json. Not committed.
```

`sitemap.xml`, `llms.txt` and `llms-full.txt` are not in the tree because
`build.py` writes them from `data/`, so they can never sit stale.

## Change something

Every row below is a single-file edit. Nothing else needs touching: the site, all
three PDFs, the sitemap, the markdown twins, `llms.txt`, `llms-full.txt` and the
MCP corpus follow from it on the next build.

| I want to | Edit | Notes |
| --- | --- | --- |
| Add or update a job | `data/experience.yml` | Add a `- id:` block. `start`/`end` are `YYYY-MM`, `end: present` means current. Sorting, "2 yr 8 mo" and the timeline all compute from those, so never type a duration by hand. |
| Give a role the same duties as another | `data/experience.yml` | `duties_see: <the other role's id>` instead of a `duties:` list. The build resolves it and names the company it came from. |
| Get a role onto the CV PDF | `data/experience.yml` | Its `highlights:` are what the CV prints, 3 to 6 bullets. `duties:` only ever appear on /experience and in the JDs PDF. |
| Add a certification or qualification | `data/education.yml` | `featured: true` also puts it in the CV's short education list. Keep that list to about six. |
| Add a course | `data/courses.yml` | `featured: true` puts it in the CV's course shortlist. |
| Change a skill level, or add a skill | `data/skills.yml` | `level:` is 1 to 5 and drives the meter width. `cv: true` puts it in the CV highlights, aim for about 18 across all groups. |
| Change the summary, headline, contact details or the counters | `data/profile.yml` | The counters take either a fixed `value:` or a `since:` year, which is computed at build time so nobody has to bump a number. |
| Change the cover letter | `data/profile.yml` | The `cover_letter:` block: salutation, paragraphs, sign-off. |
| Hide the "available" banner | `data/profile.yml` | `availability.show: false`. |
| Change where an off-site link points | `data/profile.yml` | The `links:` block. Each one is read wherever it appears, so `docs:` moves the nav entry, the footer, the contact page, both PDFs and `llms.txt` together. `website:` must equal `SITE["base_url"]` in `build.py`; the build fails if they differ. |
| Add a page | `scripts/build.py` and `templates/` | Append an entry to `PAGES` (it drives the nav, the sitemap and the SEO metadata), then add the template it names. A page in the sitemap also needs `templates/md/<name>.md`, its markdown twin. |
| Change how the markdown copies read | `templates/md/` | `_macros.md` is shared by the twins, `llms-full.txt` and the corpus, so a role changes everywhere at once. Labels come from `t()`, so a new one goes in both `data/i18n/*.yml`. |
| Add a document to the MCP corpus | `scripts/build.py` and `templates/md/corpus/` | A row in `CORPUS`, and the template it names, opening with `# Title`. Keep paths stable: agents keep them. |
| Add a fourth PDF | `scripts/build.py` and `templates/print/` | Add the sheet to `PAGES` with `print: True`, then add it to `PDFS`. `render_pdf.py` imports that list rather than keeping its own copy. |
| Change a colour, a spacing step or an animation | `assets/site.css` | Read `docs/design-system.md` first. It is the contract the CSS, the JS and the templates all share. |

## Local development

Python 3 and `make`. Nothing else.

```bash
make install    # pip install -r requirements.txt, then Playwright's Chromium
make serve      # render the site and the PDFs, then serve on http://127.0.0.1:8788/
```

| Command | What it does |
| --- | --- |
| `make build` | Render `data/` + `templates/` into `dist/`. No Chromium needed. |
| `make pdf` | Build, then print the three PDFs into `dist/downloads/`. |
| `make serve` | Build with PDFs, then serve `dist/` on `127.0.0.1:8788`. |
| `make clean` | Delete `dist/`. |
| `make install` | Install the Python deps and Playwright's Chromium (a separate download). |

`make serve` renders the PDFs as well as the pages, deliberately: a preview with
dead `/downloads/` links hides exactly the kind of breakage worth catching before
a deploy.

To check the real headers and the real 404 instead of just the pages, use Wrangler
rather than the built-in server. It applies `_headers` and `not_found_handling`:

```bash
make build && npx wrangler dev
```

Jinja runs with `StrictUndefined`, so a typo in a template is a failed build with
a line number, not a page with a hole in it.

## How the PDFs are made

Three documents, all from the same data as the site:

| Output | Sheet | Budget |
| --- | --- | --- |
| `/downloads/Caleb_Sargeant_CV.pdf` | `templates/print/cv.html` | 2 pages |
| `/downloads/Caleb_Sargeant_JDs_and_Duties.pdf` | `templates/print/jds.html` | grows with the data, no limit |
| `/downloads/Caleb_Sargeant_Cover_Letter.pdf` | `templates/print/cover.html` | 1 page |

`scripts/render_pdf.py` starts a throwaway HTTP server on an ephemeral localhost
port, points Playwright's Chromium at the print sheets already sitting in `dist/`,
waits for `document.fonts.ready`, and prints each one to A4 with zero margins (the
`.sheet` element owns its own padding). It serves over HTTP rather than opening
`file://` URLs because printing from `file://` looks like it works and then
silently ruins the output: the webfont request is blocked as cross-origin and
root-relative asset paths resolve against the filesystem root, so the PDF comes
out in a fallback font.

If a sheet goes over its page budget the run prints a warning and carries on. That
is the signal that an edit in `data/` has outgrown the layout, usually too many
`highlights` on the CV.

A page count alone does not catch everything, because a `.sheet` is a fixed-height
box that clips: content that outgrows it slides under the page footer rather than
starting a new page, and the PDF still reports the same number of pages. So each
sheet is also measured in the browser before it is printed, and a sheet whose last
line runs into its own footer gets the same warning. Adding the thirteenth role to
`data/experience.yml` did exactly that to the CV's first sheet.

**The PDFs are never committed.** `dist/` is gitignored and CI rebuilds everything
on every deploy, so a downloaded CV cannot silently disagree with `data/`. That is
the one failure this repo exists to make impossible.

Locally:

```bash
make pdf                              # render them
python3 scripts/render_pdf.py --check # assert they exist, are PDFs, and are not empty
```

The OG card and the favicons are the exception. They are also generated, by
`scripts/render_images.py`, but they change about once a year and committing them
keeps the normal build free of a Chromium dependency. Re-run that script after
editing `assets/favicon.svg` or `templates/social/og.html`.

## Deploy

Deploys are automatic. Push to `main` and the site is live in about a minute.

| Trigger | What happens |
| --- | --- |
| Push to `main` | build + PDFs, then `wrangler deploy`, live on calebsargeant.com, then the MCP corpus into R2 |
| Pull request | build + PDFs, then `wrangler versions upload`, an aliased preview URL posted on the PR |
| Manual re-run on `main` | Re-publishes production (use it for rollbacks) |

The site is served by a Cloudflare **Worker** using static assets, which is
Cloudflare's [recommended path for new projects](https://developers.cloudflare.com/workers/static-assets/).

The Worker is **assets-only**: `wrangler.toml` has no `main`, so no code sits in
the request path. Asset requests are served straight from the edge, which is free
and has no cold start. It also keeps `_headers` authoritative, because custom
headers are not applied to responses generated by Worker code. Adding an
entrypoint would silently strip the CSP from anything that entrypoint handled.

### Hostnames

The site is **apex-canonical**. `SITE["base_url"]` in `scripts/build.py` is
`https://calebsargeant.com`, and every `<link rel="canonical">`, `og:url`,
hreflang, `sitemap.xml` entry, JSON-LD URL, the `Sitemap:` line in `robots.txt`
and `Canonical:` in `security.txt` say the same. `links.website` in
`data/profile.yml` is the same fact again, and the build fails if the two differ.

- `https://www.calebsargeant.com/*` is **301'd to the apex**, path preserved, by
  a Redirect Rule on the zone. The rule is configured in Cloudflare, not in this
  repo: a Worker with no entrypoint cannot issue a redirect, `_redirects` matches
  on path only, never on hostname, and managing zone rules needs
  `Zone: Rulesets Edit`, which the deploy token deliberately does not carry.
- The apex is served by this Worker: a **plain Workers route** in
  `wrangler.toml`, and a Worker custom domain attached outside it.
- A route attaches to a hostname that already has a proxied DNS record and
  intercepts the request before it reaches the origin. Both hostnames had
  proxied records pointing at the old Google Sites, so the Worker took over and
  that origin is never asked. No DNS record is created, changed or deleted by a
  deploy, and there is no cutover window.
- The **www route stays** in `wrangler.toml`. The Redirect Rule answers before
  it, so it serves nothing today, but if the rule is ever removed www serves the
  site (still canonical on the apex) instead of whatever its old record points at.
- Canonicals used to name www. Once the redirect existed, that meant every page
  declared a canonical URL that only ever answers with a 301, which search
  engines treat as a hint to second-guess. Keep `base_url` on the host that
  actually returns 200.

> **Why not `custom_domain = true`?** It was tried first and cannot work here.
> Cloudflare refuses to attach a Worker custom domain to a hostname that already
> owns a DNS record, and `override_existing_dns_record` is
> [not exposed by the CLI or config](https://github.com/cloudflare/workers-sdk/issues/9878).
> The deploy uploaded every asset and then failed with the API error body
> swallowed, which took a read-only probe in the deploy workflow to diagnose: the
> token was correctly scoped all along, the record was the whole problem. Deleting
> the record would also have worked, at the cost of taking the old site down for
> the gap between the delete and the next successful deploy. Routes have no such
> gap, so they win.

> **A conflicting DNS record blocks the custom domain.** Cloudflare refuses to
> attach a Worker custom domain to a hostname that already has its own A or CNAME
> record:
>
> ```
> Hostname 'www.calebsargeant.com' already has externally managed DNS records
> ```
>
> Wrangler cannot force past this. The `override_existing_dns_record` option the
> error suggests is [not exposed by the CLI or config](https://github.com/cloudflare/workers-sdk/issues/9878).
> Delete the stale record in the Cloudflare dashboard (DNS, then Records) and
> re-run the deploy; Wrangler then creates the right record itself.

### One-time Cloudflare setup

Two Actions secrets on the repo:

| Secret | Where it comes from |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard, Workers & Pages overview (right-hand column) |
| `CLOUDFLARE_API_TOKEN` | Minted from the **Edit Cloudflare Workers** template, below |

Mint the token from Cloudflare's
[**Edit Cloudflare Workers** template](https://developers.cloudflare.com/fundamentals/api/reference/template/)
(My Profile, API Tokens, Create Token) rather than hand-picking permissions.
Cloudflare maintains the template, so it tracks what Wrangler actually needs:

| Scope | Permission |
| --- | --- |
| Account | Workers Scripts, Edit |
| Account | Workers KV Storage, Edit |
| Account | Workers R2 Storage, Edit |
| Account | Workers Tail, Read |
| Account | Account Settings, Read |
| Zone | Workers Routes, Edit |
| User | User Details, Read |
| User | User Memberships, Read |

Scope it to this account, and to the `calebsargeant.com` zone for the zone
permission. `Workers Routes: Edit` is what lets a deploy attach a route.
Despite appearances there is **no `DNS: Edit` in the template**, because the
Workers custom-domain API creates its DNS record itself rather than going through
the DNS API. Adding `DNS: Edit` is not required.

This site exercises Workers Scripts, Workers Routes and Account Settings for the
deploy, and **Workers R2 Storage: Edit** for the corpus publish, which writes one
object to the `calebsargeant-docs-index` bucket (see "For assistants"). It has no
KV or tail usage. Trimming the template is possible but means revisiting it
whenever Wrangler starts calling something new, which is exactly the
maintenance the template exists to absorb. Trim R2 away and the deploy still
succeeds while the publish step fails.

### The first PR preview needs the Worker to exist

`wrangler versions upload` uploads a version of a Worker, so deploy `main` once
before expecting preview URLs. `workers_dev = false` and `preview_urls = true` in
`wrangler.toml` are a pair: `preview_urls` defaults to whatever `workers_dev` is,
so turning off the duplicate `*.workers.dev` copy of the site would take PR
previews with it. If previews ever stop producing a URL, check that line first.

## Discoverability

- `robots.txt` carries Content Signals ([contentsignals.org](https://contentsignals.org/))
  and disallows `/print/`, so the noindex print sheets stay out of results while
  the PDFs they produce remain linkable. Its comments point assistants at the
  files below.
- `sitemap.xml` is generated by `build.py` from `PAGES`, minus anything marked
  `sitemap: False`, with `lastmod` stamped to the build date.
- `.well-known/security.txt` ([RFC 9116](https://www.rfc-editor.org/rfc/rfc9116))
  is the disclosure contact. Its `Expires` is hand-set, so bump it when it gets
  close; nothing stamps it for you.

### For assistants

Four outputs, all written by `build.py` from `data/` through `templates/md/`,
which renders with autoescaping off (so "&" stays "&") and shares one set of
macros, `_macros.md`. None of it is hand-written, so none of it can drift from
the pages. There used to be a hand-written `llms.txt`; it had already drifted.

| Output | What it is |
| --- | --- |
| `/llms.txt` | The [llmstxt.org](https://llmstxt.org/) map: summary, current roles (the `end: present` ones), every page's markdown twin with its meta description, the PDFs, the docs site and the MCP server, contact. English, root only. |
| `/llms-full.txt` | The whole CV in one markdown file: profile, every role with highlights, stack and full duties, education, courses, skills, contact. English. |
| `<page>index.md` | A twin of every page in the sitemap, in every locale (`/experience/index.md`, `/nl/experience/index.md`), from `templates/md/<page>.md` with the same context as the HTML, so a Dutch twin comes out of the Dutch catalogue. Each page links its twin with `<link rel="alternate" type="text/markdown">`; each twin is served with `Link: <page>; rel="canonical"`, rules `build.py` appends to `dist/_headers`, so search engines index the page and not the copy. |
| `.docs-index/index/website.json` | The search corpus for the MCP server at `https://mcp.calebsargeant.com/`: `profile.md` (read first), `experience.md`, one `experience/<role id>.md` per role, `education.md`, `courses.md`, `skills.md` and `contact.md`, each with the canonical URL it came from. English, not served by the site. |

The corpus follows the MCP server's schema 1 (`repo`, `site_url`, `generated`,
`commit`, and per document `path`, `title`, `headings`, `snippet`, `url`,
`text`, `bytes`). An unchanged build writes identical bytes: keys are sorted,
`generated` is the build date at day precision and `commit` is `GITHUB_SHA` or
`HEAD`. A corpus URL whose anchor is missing from the built page fails the build.

The production deploy job then puts it into R2 with `wrangler r2 object put
calebsargeant-docs-index/index/website.json ... --remote`, after the deploy and
never from a PR preview, because the bucket is shared with the docs site's
`index/docs.json` and read by production agents. `--remote` matters: without it
Wrangler 4 writes to a local simulation and exits 0. The token needs
`Workers R2 Storage: Edit`.

`_headers` adds `charset=utf-8` to `.md` and `.txt`. Production serves them as
bare `text/markdown` and `text/plain`, and `wrangler dev` adds the charset on
its own, so a missing charset never shows up locally.

## Design

`docs/design-system.md` is the contract between `assets/site.css`,
`assets/site.js`, `assets/hero-net.js` and the templates: the tokens, the exact
class names, the animation catalogue, the print rules and the accessibility floor.
A class name in that document is the class name in all three places, so changing
it in one place breaks the other two.

`docs/template-context.md` is the other half: every variable `build.py` hands a
template, the enriched fields on a role, and the blocks `base.html` expects a
child template to override.

Both are normative. Read them before touching CSS, JS or a template.

## Notes

- **Editing a rendered page does nothing.** `dist/` is deleted at the start of
  every build. The page came from `templates/` and the words came from `data/`.
- **The theme bootstrap is inline on purpose.** It stamps `data-theme` on `<html>`
  before first paint, so moving it into `site.js` means a frame of the wrong theme
  on every page load. `_headers` currently allows it with `'unsafe-inline'` and
  carries a TODO explaining how to pin it by hash instead.
- **A colour defined only inside a theme block is a bug.** Every token is declared
  on `:root`; the light theme redefines a named subset. See
  `docs/design-system.md` section 1.
