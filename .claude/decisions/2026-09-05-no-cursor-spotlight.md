# No cursor spotlight. Pointer feedback on the thing you are over is fine

**Status:** accepted (2026-09-05, revised same day)

## Context

The first build of this site shipped three pointer-driven effects, inherited
from the shape of magmamoose.com's earlier `site.js`:

1. `.cursor-glow`, a soft accent spotlight following the cursor around the page.
2. `[data-magnetic]`, primary buttons leaning up to 6px toward the pointer.
3. The hero canvas: nodes near the cursor drift toward it and brighten, and the
   edges around it gain a little alpha.

The owner had already removed the spotlight from magmamoose.com three times and
written it up there
(`magmamoose/website/.claude/decisions/2026-08-29-no-cursor-spotlight.md`). It
reappeared here because this repo was built from that repo's earlier state.

The first version of this ADR read that history as a blanket "nothing tracks
the pointer" and removed all three. That was wrong, and the owner said so: the
magnetic buttons and the canvas lean are wanted. Only the spotlight goes.

## Decision

**The spotlight is out. Local pointer feedback stays.**

The line is what the effect is attached to:

- A **spotlight** is ambient. It lights whatever happens to be near the cursor,
  it is on the whole time, and it is a second moving thing competing with the
  content for attention. Out, permanently.
- **Magnetic buttons and the canvas lean** are local. They respond only for the
  control or the region the pointer is actually over, they are silent
  everywhere else, and what they communicate is "this is the thing you are
  about to interact with". In.

Both survivors stay gated on `(hover: hover) and (pointer: fine)` and on
`prefers-reduced-motion: no-preference`, so neither runs on touch or against a
stated preference.

## Consequences

- `initCursorGlow`, the `.cursor-glow` rules and the `--lit-cast` shadow routing
  are gone. `.card-hover:hover` declares its own fixed two-layer shadow, because
  there is no longer a pointer position to throw a shadow from.
- `initMagnetic` writes to `translate`, not `transform`, so the CSS hover lift
  on the same element composes with it instead of being overwritten.
- **The rule to apply to a new effect is "is it ambient or is it local?"** An
  ambient pointer effect is this ADR's rejected half; a local one is not.
