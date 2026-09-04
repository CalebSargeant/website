# Nothing on the page tracks the pointer

**Status:** accepted (2026-09-05)

## Context

The first build of this site shipped three pointer-following effects, all copied
in from the shape of magmamoose.com's older `site.js`:

1. `.cursor-glow`, a soft accent spotlight following the cursor.
2. `[data-magnetic]`, buttons translating up to 6px toward the pointer.
3. The hero canvas leaning its nodes toward the cursor and brightening the edges
   nearest it.

The owner had already removed the same spotlight from magmamoose.com, three
times, and written it up there as an ADR
(`magmamoose/website/.claude/decisions/2026-08-29-no-cursor-spotlight.md`). It
came back here because this repo was built from that repo's earlier state.

## Decision

All three are gone, and the rule is the general one rather than the specific
one: nothing on this site follows the pointer. Hover is the only thing that
lights an element, and it does it with fixed offsets.

Removed: `initCursorGlow` and `initMagnetic` in `assets/site.js` (with
`FINE_POINTER`, whose only two readers they were); the `.cursor-glow` rules and
the `--mx`/`--my` term in the `.btn` transform in `assets/site.css`; every
`data-magnetic` attribute in `templates/`; and the `pointermove` handler, the
`POINTER_R` constant, the per-node `glow` field and the cached `rect` in
`assets/hero-net.js`.

## Rationale

The general rule, not just the spotlight, because the objection is to the page
reacting to where the cursor is rather than to what it is over. A magnetic
button and a cursor-seeking canvas are the same idea at a smaller amplitude, and
leaving them in would have meant having this conversation twice more.

The hero canvas is still the signature animation. It just runs on its own
timing now, which is what makes it read as telemetry you are watching rather
than a toy you are prodding.

## Consequences

- `site.js` loses ~75 lines and both of its per-frame layout reads.
- `hero-net.js` no longer listens to `pointermove`, `scroll` or `blur`, so on a
  page where the hero is off-screen it now costs literally nothing.
- The reduced-motion block needs no pointer opt-outs.
- **If a branch reintroduces a pointer-following effect, this ADR is the
  answer.** Revert it.
