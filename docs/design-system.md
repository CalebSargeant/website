# Design system: calebsargeant.com

The contract between `assets/site.css`, `assets/site.js`, `assets/hero-net.js`
and `templates/`. Everything below is normative: a class name here is the class
name in the CSS and in the templates. Change it in one place and you break the
other two.

House lineage: this borrows the *structure* of magmamoose.com (dark ground,
mono kickers, reveal-on-scroll, one stylesheet, one JS file, progressive
enhancement) and none of its palette. Magma Moose is molten orange on obsidian.
This is signal cyan on ink: a network/telemetry read, not a foundry one.

---

## 1. Tokens

Declared once on `:root` in `assets/site.css`. Dark is the default; the light
theme redefines the same names under `:root[data-theme="light"]`.

```
/* ground */
--ink            #080B10   page ground (dark)
--ink-2          #0D131B   raised surfaces: panels, cards, nav
--ink-3          #121A24   inset: code, table stripes
--line           rgba(255,255,255,0.075)   hairline
--line-2         rgba(255,255,255,0.14)    stronger hairline, dense content

/* text */
--fg             #EAF2F8   primary
--fg-dim         #9FB3C4   secondary
--fg-mute        #748A9F   tertiary, kickers (AA on --ink-3 at 11px)

/* accent, "signal" */
--sig            #38E1FF   accent (cyan)
--sig-2          #4C6FFF   accent end (indigo)
--sig-ink        #7FEAFF   accent as small text on dark (contrast-safe)
--sig-wash       rgba(56,225,255,0.08)
--grad-sig       linear-gradient(120deg, var(--sig), var(--sig-2))

/* status */
--live           #4ADE80   available / current / success
--warn           #FBBF24
--crit           #F87171

/* type */
--font-display   "Space Grotesk", system-ui, -apple-system, sans-serif
--font-mono      "JetBrains Mono", ui-monospace, SFMono-Regular, monospace
--tracking-kicker 0.24em
--tracking-display -0.035em

/* geometry */
--maxw           1180px
--radius-card    20px
--radius-panel   14px
--radius-btn     11px
--radius-chip    7px
```

Light theme (`:root[data-theme="light"]`) overrides only: `--ink #F7FAFC`,
`--ink-2 #FFFFFF`, `--ink-3 #EEF3F8`, `--line rgba(8,11,16,0.10)`,
`--line-2 rgba(8,11,16,0.18)`, `--fg #0B1219`, `--fg-dim #44586B`,
`--fg-mute #596E82`, `--sig #0891B2`, `--sig-2 #3B4FE0`, `--sig-ink #0E7490`.
Nothing else. If a colour is only defined inside a theme block, that is a bug.

Fonts come from Google Fonts (`Space Grotesk` 400/500/600/700, `JetBrains Mono`
400/500). Both `<link>`s live in `templates/base.html` only.

---

## 2. Layout primitives

| Class | Meaning |
| --- | --- |
| `.wrap` | max-width `--maxw`, 32px side padding, centred |
| `.section` | vertical rhythm block, `padding: 88px 0` |
| `.section-head` | kicker + h2 + lead, max-width 640px |
| `.section-head.center` | centred variant |
| `.grid-2` `.grid-3` | responsive card grids, collapse at 900px / 760px |
| `.panel` | bordered raised surface, `--radius-panel` |
| `.card` | `.panel` + `--radius-card` + hover lift |
| `.sr-only` | visually hidden, still announced |
| `.mono` | switches to `--font-mono` |

---

## 3. Components (exact class names)

**Nav**, `.site-nav` (sticky) → `.nav-inner` → `.brand`, `.nav-links`,
`.navlink` (`.active` for current page), `.nav-actions`. JS adds `.solid` past
24px of scroll, injects `.nav-toggle` and sets `.nav-enhanced` on `.site-nav`,
and toggles `.menu-open`.

**Buttons**, `.btn` base; variants `.btn-sig` (gradient fill), `.btn-ghost`
(hairline), `.btn-quiet` (text only). `.btn[data-magnetic]` gets pointer-follow
from `site.js`.

**Kicker / chips**, `.kicker` (mono, uppercase, tracked), `.chip` (small mono
pill), `.chip-row`, `.pill-live` (green dot + label).

**Hero**, `.hero` → `#hero-net` (canvas, `aria-hidden`), `.hero-inner`,
`.hero-badge`, `h1` with `.grad-text` on the accented span, `.lead`, `.cta-row`,
`.hero-terminal`.

**Terminal**, `.term` → `.term-bar` (three dots + `.term-title`) → `.term-body`
→ `.term-line` (`.term-ps1` prompt span, `.term-out` output span). JS types into
`[data-typewriter]` inside `.term-body`.

**Stats**, `.stat-row` → `.stat` → `.stat-num[data-count-to]` + `.stat-label`.

**Timeline**, `.timeline` → `.timeline-spine` (SVG, `#spine-path`) +
`.tl-item` (`.tl-dot`, `.tl-card`). `.tl-card` contains `.tl-when` (mono dates +
duration), `.tl-role`, `.tl-org`, `.tl-place`, `.tl-summary`, `.tl-highlights`,
`.chip-row`, and `<details class="tl-duties">` for the full duty list.

**Skill matrix**, `.skills` → `.skill-group` → `.skill` → `.skill-name`,
`.skill-meter` > `.skill-fill[data-level]`, `.skill-years`.
Filter buttons are `.filter-btn[data-filter]`; the matrix root carries
`data-active-filter`.

**Command palette**, `.cmdk` (dialog, hidden by default), `.cmdk-panel`,
`.cmdk-input`, `.cmdk-list`, `.cmdk-item` (`.is-active`), `.cmdk-empty`,
`.cmdk-hint`. Opened by ⌘K / Ctrl-K / `/`, or `[data-cmdk-open]`.

**CV page**, `.cv-toolbar` (focus filter + download), `.cv-doc` (the on-screen
document), `.cv-section`, `.cv-role`. Roles carry `data-focus="platform cloud"`;
the toolbar sets `data-cv-focus` on `.cv-doc`.

**Footer**, `.site-foot` → `.foot-inner`, `.foot-links`, `[data-year]`.

**Injected by JS** (never in a template): `.to-top`, `.scroll-progress`,
`.cursor-glow`, `.nav-toggle`, `.cmdk` markup is in `base.html` but stays
`hidden` until JS runs.

---

## 4. Animation catalogue

Everything here is gated on `@media (prefers-reduced-motion: no-preference)` or
its JS equivalent. With motion reduced, the page must be complete and static,
never blank.

| Name | Trigger | Implementation |
| --- | --- | --- |
| Reveal | IntersectionObserver | `.reveal` → `.in`; `--d` index for stagger; 1600ms safety net that force-adds `.in` |
| Hero network | rAF loop | `hero-net.js` on `#hero-net`; pauses when off-screen or tab hidden |
| Typewriter | on load | `[data-typewriter]` types its own `data-typewriter` value |
| Count-up | reveal | `[data-count-to]`, 1100ms ease-out |
| Spine draw | scroll | `#spine-path` `stroke-dashoffset` mapped to timeline scroll progress |
| Skill fill | reveal | width transitions to `level/5*100%` |
| Cursor glow | pointer move | fine pointer only; rAF-throttled |
| Magnetic button | pointer move | translate ≤6px toward pointer |
| Scroll rail | scroll | `.scroll-progress` width = read percentage |
| Theme swap | click | `View Transition API` when available, else instant |

`hero-net.js` contract: canvas `#hero-net`, sized to its parent with DPR
scaling, nodes drawn in `--sig`, packets in `--sig-2`, edges at 10% alpha. It
must cap at ~34 nodes, stop on `visibilitychange`, and no-op entirely under
reduced motion after painting one static frame.

---

## 5. Print / PDF

`assets/print.css` is a separate stylesheet used **only** by `templates/print/*`.
Light ground, `@page { size: A4; margin: 0 }`, and a `.sheet` element that is
exactly 210×297mm with its own 14mm padding. No dark tokens, no animations, no
JS. Page-break rules: `.cv-role { break-inside: avoid }`,
`.duty-group { break-inside: avoid-page }`.

Three documents, all rendered from the same data:

| Output | Template | Notes |
| --- | --- | --- |
| `/downloads/Caleb_Sargeant_CV.pdf` | `print/cv.html` | Two columns, must fit 1–2 pages |
| `/downloads/Caleb_Sargeant_JDs_and_Duties.pdf` | `print/jds.html` | Contents page + every role's `duties` |
| `/downloads/Caleb_Sargeant_Cover_Letter.pdf` | `print/cover.html` | One page |

---

## 6. Accessibility floor

Non-negotiable: visible `:focus-visible` ring in `--sig` on every interactive
element; the command palette traps focus and closes on Escape; the canvas is
`aria-hidden`; every `<details>` is keyboard-operable; `--fg-dim` and
`--fg-mute` ≥ 4.5:1 on `--ink`, `--ink-2` and `--ink-3` in both themes; the
site is fully readable and navigable with JavaScript disabled (`.reveal` only hides when `<html>` has `.js`).
