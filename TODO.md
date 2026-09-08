# TODO

Running list of work that's been named but not scoped or built yet. Not a
replacement for the numbered plan docs — this is the parking lot for things
that come up mid-conversation and shouldn't get lost.

- **Admin panel for puzzles.** A separate UI for adding/editing puzzles instead
  of hand-writing `src/data/puzzles/*.json`. Needs its own scoping pass before
  build: likely a small form over the existing `Puzzle` shape (board size,
  solution placements) that writes JSON and runs it through
  `scripts/validate-puzzles.ts` before it's accepted, so a bad puzzle can't
  reach the game. Not started. Raised 2026-09-09, alongside
  [`03-COLOR-AND-HINTS-PLAN.md`](./03-COLOR-AND-HINTS-PLAN.md).
- **Brick-count sub-tiers for the colour bands (B/C/D).** Easy/Medium/Hard only
  covers the shape-only tiers. The colour, occlusion, and combined bands don't
  have their own difficulty ladder yet — deferred, not blocking Phase 4.
