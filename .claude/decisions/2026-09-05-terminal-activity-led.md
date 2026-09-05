# The activity lamp reports real events and then stops

**Status:** accepted (2026-09-05)

## Context

The owner asked whether the flickering green light on an ethernet port or a
busy disk could go "somewhere" on the site, explicitly inviting a no.

The instinct is right for this site: a link LED is the most recognisable piece
of network hardware there is, and the audience is other infrastructure people.
The naive execution is wrong for it.

## Options considered

1. **An ambient lamp flickering somewhere on the page, forever.** Rejected, on
   three grounds:
   - Peripheral vision is tuned to detect flicker and cannot choose to ignore
     it. This is the same objection that removed the cursor spotlight three
     times (`2026-09-05-no-pointer-tracking.md`), arrived at from a different
     direction: the page should not compete with its own content.
   - Sustained flicker is an accessibility liability. A 6px dot is under WCAG
     2.3.1's area threshold so it is not a hard failure, but "not technically a
     seizure risk" is a poor thing to aim at.
   - It would be **fake telemetry on a site whose entire premise is that
     nothing here is fake**. The credibility of this repo is that `data/*.yml`
     is the source of truth and nothing can drift from it. A light that reports
     nothing is the one decoration that actively argues against that.
2. **A lamp driven by real, bounded activity.** Chosen.

## Decision

The hero terminal's chrome carries an `ACT` lamp, and it reports that
terminal's own state:

- `site.js` pulses `--lit` once per character typed. The CSS decays it over
  150ms, so at the typewriter's ~28ms a character the lamp sits near-lit with
  small dips. That is what a NIC under sustained load looks like, because it is
  the same mechanism: one pulse per unit of traffic.
- When the last line lands, `.is-linked` latches it to a steady dim green: link
  up, no traffic. That is the state it holds for the rest of the visit.
- Under `prefers-reduced-motion` the typewriter fills instantly, so the lamp
  goes straight to steady and never pulses at all.

It also replaced something worse. The bar's three macOS traffic-light dots are
skeuomorphism reporting nothing; a live readout beside them is a strict
improvement on dead decoration.

## Consequences

- Any future lamp must answer "what real event drives this?" before it ships.
  An answer of "it looks busy" is this ADR's rejected option 1.
- The effect is over about four seconds after load and never repeats, which is
  the property that makes it acceptable at all.
