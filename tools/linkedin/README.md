# LinkedIn sync

The website (`content/profile.json`) is the single source of truth. These tools keep
LinkedIn in step with it. Read this before running anything that touches your account.

## ⚠️ Important reality check

LinkedIn has **no supported API** for an individual to programmatically edit their own
profile's experience/positions — the Profile Edit API is a gated Partner Program feature.
So there are three honest options here:

| Tool | Direction | ToS | Effort to apply |
| --- | --- | --- | --- |
| `generate_sections.py` | site → clipboard | ✅ Safe | Paste each block (~30s) |
| `import_linkedin_export.py` | LinkedIn → site | ✅ Safe (your own data export) | One-time bootstrap |
| `push_playwright.py` | site → LinkedIn | ⚠️ **Against LinkedIn's User Agreement** (automation). Account-restriction risk. | Automated, **opt-in only** |

**Recommended:** edit `profile.json`, run `generate_sections.py`, paste. It's seconds of
work and risks nothing.

## generate_sections.py (recommended)

```bash
python tools/linkedin/generate_sections.py
```

Prints copy-paste-ready **Headline**, **About**, and per-role **Experience** text built
from `profile.json`.

## import_linkedin_export.py (bootstrap from LinkedIn)

Request your data export from LinkedIn (Settings → Data privacy → Get a copy of your data
→ "Positions", "Profile", "Education", "Skills"). Then:

```bash
python tools/linkedin/import_linkedin_export.py --export-dir ~/Downloads/linkedin-export
```

Writes/updates `content/profile.json` from the CSVs. ToS-safe — it's your own export.

## push_playwright.py (opt-in automation — use at your own risk)

Drives a real browser to fill your **Headline** and **About** from `profile.json`.
Disabled unless you pass `--i-understand-tos-risk`. Requires:

```bash
uv pip install playwright && playwright install chromium
python tools/linkedin/push_playwright.py --i-understand-tos-risk
```

It opens a window for you to log in manually (no credentials are stored or scripted),
then updates Headline + About. It does **not** touch individual positions (too fragile and
higher-risk) — use `generate_sections.py` for those.
