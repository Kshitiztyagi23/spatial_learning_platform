# TODO

Running list of work that's been named but not scoped or built yet. The full
roadmap is in [`docs/PROJECT_PLAN.md`](./docs/PROJECT_PLAN.md); this is the
parking lot for things that come up mid-conversation and shouldn't get lost.

## Next up

- **Window / mental-rotation test** (in progress, Kshitiz). To plug it in:
  add the stage to `DEFAULT_STAGES` (`backend/app/models/protocol.py`),
  `STAGE_ROUTES` (`frontend/src/orchestration/stages.ts`) and
  `SCHEDULE_STAGES` (`frontend/src/admin/ScheduleEditor.tsx`); add it to
  `TEST_STAGES` in `backend/app/services/study_design.py` so the recommended
  design uses it; record answers through `POST /sessions/{id}/trials` with a
  new `task_type` and scoring rule in `backend/app/services/scoring.py`.
- **Session feedback stage.** The plan's `SESSION_FEEDBACK` step at the end of
  each session isn't built.
- **Rate-limit the code lookup.** `POST /participants/lookup` returns a first
  name for a valid code. Codes are 6 characters from 32 symbols (~1 billion),
  but the endpoint should still be rate-limited before going online.
- **Assent in later rounds.** Returning students skip the consent page. Check
  with the ethics protocol whether each session needs a fresh assent.
- **LEGO hint ladder, later rungs.** Rungs 2–3 (error type, then where to look)
  are built as text. Not yet: the soft region overlay on the view card, and
  rung 5's opt-in "Show me" that reveals one cell
  (`docs/lego-task/COLOR-AND-HINTS-PLAN.md` §4).
- **Server-side LEGO validation.** Puzzle results are computed in the browser
  with the tested `check()` and scored on the server; the server doesn't
  re-validate builds against the puzzle solutions.
- **LEGO timer survives refresh.** The time limit restarts if the page is
  refreshed mid-task.
- **Bundle size.** The production JS is ~1.5 MB (~420 KB gzipped), mostly
  Three.js. Lazy-loading the LEGO task would speed up the first page on slow
  school networks.
- **Deployment.** The plan's AWS setup is optional; see the hosting notes.

## Content and decisions

- **Clear test data before the real study.** The database holds ~29
  participants from development and testing, already in groups from the old
  random assignment. They'd appear in exports and group counts.
- **Hint wording review.** Fixed hints are in
  `backend/app/services/feedback_rules.py` and the AI instructions in
  `backend/app/services/ai_feedback.py`; the research team should approve
  both. Bump `RULE_VERSION` on any change.
- **AI provider and cost.** Pick a provider and model (`AI_*` in
  `backend/.env`), then measure hint latency and cost on a pilot. The admin
  console shows which provider is active.
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
- **WebSocket feedback channel.** Feedback is request/response over HTTP
  (the plan's own example event response carries the feedback inline). A
  WebSocket is only needed if the server must push messages unprompted.

## Tooling

- Frontend LEGO tests under `src/tasks/lego/**/__tests__` have no runner
  since vitest isn't installed.
