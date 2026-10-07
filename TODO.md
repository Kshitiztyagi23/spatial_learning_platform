# TODO

Running list of work that's been named but not scoped or built yet. The full
roadmap is in [`docs/PROJECT_PLAN.md`](./docs/PROJECT_PLAN.md); this is the
parking lot for things that come up mid-conversation and shouldn't get lost.

## Next up

- **Window / mental-rotation task.** In the plan's baseline assessment and
  stage sequence (`WINDOW_TEST_TASK`), not started. Needs stimuli and a
  decision on the response format.
- **Real-time feedback engine.** Rule-based, condition-aware hints (plan §6):
  WebSocket channel, cooldowns, writes to `feedback_events`. The LEGO
  diagnosis engine (`frontend/src/tasks/lego/core/diagnose.ts`) already
  produces hint material but isn't shown. Today experimental and control
  participants see the same thing.
- **Third condition.** The plan has experimental / control task / no
  intervention; the platform assigns only two.
- **Session feedback stage and multi-round sessions.** No `SESSION_FEEDBACK`
  stage; `round_number` is always 1; no per-session/per-participant exports.
- **LEGO protocol settings not yet enforced.** `time_limit_seconds` and
  `ai_hints_enabled` are saved but the LEGO task ignores them.
- **Server-side LEGO validation.** Puzzle results are computed in the browser
  with the tested `check()` and scored on the server; the server doesn't
  re-validate builds against the puzzle solutions.
- **Deployment.** See the hosting discussion; the plan's AWS setup is optional.

## Content and decisions

- **Final perspective-taking artwork.** Scenario images under
  `frontend/public/perspective/templates/` are placeholders.
- **Brick-count sub-tiers for the colour bands (B/C/D).** One puzzle each,
  no difficulty ladder yet.
- **Puzzle editor in the admin console.** New puzzles are hand-written JSON
  under `frontend/src/tasks/lego/data/puzzles/`, and each id must also be
  added to `ALL_LEGO_PUZZLE_IDS` and `AVAILABLE_LEGO_PUZZLES` in the backend.
- **Should consent be a required stage?** Only demographics is forced today.

## Deferred

- **Difficulty adaptation** (plan §6: ≥85% up, ≤70% down). Dropped for now
  (2026-10-07); the `adaptation_decisions` table stays unused until revisited.

## Tooling

- Frontend LEGO tests under `src/tasks/lego/**/__tests__` have no runner
  since vitest isn't installed.
