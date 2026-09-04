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
│   └── social/og.html           the 1200x630 Open Graph card, rendered by render_images.py
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
├── wrangler.toml                the assets-only Worker and the www custom domain
├── _headers                     CSP, HSTS, cache policy
├── robots.txt · llms.txt · .well-known/security.txt   crawl, AEO and disclosure surface
├── .github/workflows/deploy.yml production deploys and PR previews
└── dist/                        generated. Deleted and rewritten on every build. Not committed.
```

`sitemap.xml` is not in the tree because `build.py` writes it, stamped with the
build date, so it can never sit stale or in the future.

## Change something

Every row below is a single-file edit. Nothing else needs touching: the site, all
three PDFs, the sitemap and `llms.txt` follow from it on the next build.

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
| Add a page | `scripts/build.py` and `templates/` | Append an entry to `PAGES` (it drives the nav, the sitemap and the SEO metadata), then add the template it names. |
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
| Push to `main` | build + PDFs, then `wrangler deploy`, live on www.calebsargeant.com |
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

The site is **www-canonical**. Every `<link rel="canonical">`, every `og:url`,
every `sitemap.xml` entry and `SITE["base_url"]` in `scripts/build.py` all say
`https://www.calebsargeant.com`.

- `www.calebsargeant.com` is the Worker's custom domain. `wrangler deploy`
  attaches it and provisions its DNS record and certificate, so it must not be
  managed anywhere else.
- `calebsargeant.com` (the bare apex) 301s to `www` through a Cloudflare redirect
  rule on the zone, not through this Worker. Cloudflare's `_redirects` file
  matches on path only and cannot redirect a hostname.

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
permission. `Workers Routes: Edit` is what lets a deploy attach the custom domain.
Despite appearances there is **no `DNS: Edit` in the template**, because the
Workers custom-domain API creates its DNS record itself rather than going through
the DNS API. Adding `DNS: Edit` is not required.

This site only really exercises Workers Scripts, Workers Routes and Account
Settings; it has no KV, R2 or tail usage. Trimming the template is possible but
means revisiting it whenever Wrangler starts calling something new, which is
exactly the maintenance the template exists to absorb.

### The first PR preview needs the Worker to exist

`wrangler versions upload` uploads a version of a Worker, so deploy `main` once
before expecting preview URLs. `workers_dev = false` and `preview_urls = true` in
`wrangler.toml` are a pair: `preview_urls` defaults to whatever `workers_dev` is,
so turning off the duplicate `*.workers.dev` copy of the site would take PR
previews with it. If previews ever stop producing a URL, check that line first.

## Discoverability

- `robots.txt` carries Content Signals ([contentsignals.org](https://contentsignals.org/))
  and disallows `/print/`, so the noindex print sheets stay out of results while
  the PDFs they produce remain linkable.
- `llms.txt` ([llmstxt.org](https://llmstxt.org/)) is a markdown map of the site,
  so an assistant can answer from a primary source instead of scraping HTML.
- `sitemap.xml` is generated by `build.py` from `PAGES`, minus anything marked
  `sitemap: False`, with `lastmod` stamped to the build date.
- `.well-known/security.txt` ([RFC 9116](https://www.rfc-editor.org/rfc/rfc9116))
  is the disclosure contact. Its `Expires` is hand-set, so bump it when it gets
  close; nothing stamps it for you.

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
