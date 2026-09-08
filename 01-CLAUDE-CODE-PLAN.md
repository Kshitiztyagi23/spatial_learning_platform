# Plan — Claude Code

**Model:** Sonnet 5 (`/model sonnet`). Pro's flat-rate access in the terminal is Sonnet; Opus would drain the window fast. Escalate to Opus in the Claude web app for design arguments, not for writing code.

**You own:** the rules of the world. Grid maths, rotation, placement legality, projection, checking, puzzle data, the store, the tests. Nothing you write imports React or three.js.

**You do not own:** anything under `src/scene/`, `src/ui/`, `src/styles/`, `App.tsx`, `main.tsx`. Antigravity is editing those live. Do not touch them, do not "just fix" them, do not reformat them.

Read `00-SHARED-SPEC.md` first. It is binding.

---

## Session 1 — M0, the unblock

Nothing else can start until this lands. Do it in one sitting and push.

1. Scaffold: `npm create vite@latest brick-views -- --template react-ts`, then add `three`, `@react-three/fiber`, `@react-three/drei`, `zustand`, `vitest`.
2. `tsconfig.json`: `strict: true`, `noUncheckedIndexedAccess: true`. Path alias `@/` → `src/`.
3. Create every directory in spec §7, with a one-line `.gitkeep` note in the ones Antigravity owns so it can't get confused about where things live.
4. Write `src/core/types.ts` — verbatim from spec §6. This is a contract, not a draft. If you think something in it is wrong, stop and write it in `HANDOFF.md` rather than changing it.
5. Write `OWNERSHIP.md`: the table from spec §7 plus the rule "never edit a file you don't own."
6. Create `HANDOFF.md` with two headings: `## For Antigravity` and `## For Claude Code`.
7. Write one fixture puzzle at `src/data/puzzles/step-01.json` — the example in spec §4. Antigravity needs real data to render against.
8. `README.md`: how to run, how to test, where the spec lives.

Push. Tell the human Antigravity is unblocked.

---

## Session 2 — geometry and placement

`src/core/pieces.ts`

The three `PieceType` records from spec §3. Frozen object, exported as `PIECES: Record<PieceTypeId, PieceType>`.

`src/core/geometry.ts`

- `footprintFor` — rotation 0/180 gives `{w: width, d: depth}`; 90/270 swaps them.
- `cellsFor` — origin is the min corner after rotation, so this is just a nested loop over the rotated footprint. No trigonometry. If you find yourself writing `Math.cos`, you've overcomplicated it.
- `brickAtCell` — linear scan over placements, expanding each to cells. Fine at this scale; don't build a spatial index.

`src/core/placement.ts`

- `canPlace` checks in this order and returns the first failure: `none-left` → `out-of-bounds` → `overlap` → `unsupported`. Order matters, because the message the child sees is the first reason.
- Support: every cell needs `y === 0` or an occupied cell at `(x, y-1, z)`.
- `canRemove` returns `load-bearing` if any cell directly above any of the brick's cells is occupied.

Tests first for this file. It's where the bugs live.

- 2×3 at rotation 90 occupies 3 along x and 2 along z.
- A brick straddling the board edge is rejected.
- A brick with one cell over a hole is rejected as unsupported.
- A brick on the plate under another brick can't be removed.
- Placing with tray count 0 is rejected even when the space is legal.

---

## Session 3 — projection and puzzles

`src/core/projection.ts`

- `projectCells` — three sets, per the table in spec §2.
- `toGrids` — this is the one that will be wrong. Row 0 is the top row of the rendered card. Front and right count `y` downward. Right counts `z` from high to low. Top counts `z` from low to high with front at the top of the card.

Write the test as a picture. Build an L that is asymmetric on every axis, hardcode the three expected grids as arrays of `0`/`1` rows in the test file, and compare. If the test is readable as a drawing, the flip bug can't hide.

`src/core/puzzle.ts`

- `derivePuzzle` — expand solution to cells, project, gridify, tally the tray.
- `validatePuzzle` — replay the solution through `canPlace` in array order with a full tray. Any rejection is a fatal authoring error with the offending `instanceId` in the message.
- Loader: `import.meta.glob` over `src/data/puzzles/*.json`, sorted by filename. Puzzle order is filename order, so name them `step-01` … `step-06`.

`src/core/check.ts`

Spec §5. Normalise both sides. Return `empty` before anything else if nothing is placed.

`scripts/validate-puzzles.ts` — runs `validatePuzzle` over every file, exits non-zero on failure. Wire it into `npm test`.

---

## Session 4 — the store

`src/state/session.ts`, zustand, shape exactly as spec §6.

- `place(origin)` uses `selectedType` and `rotation`. On success: push a placement with a fresh `instanceId`, decrement `remaining`, clear `lastCheck` and `lastReject`. On failure: set `lastReject` only.
- `removeAt(cell)` finds the brick, checks `canRemove`, increments `remaining`.
- Any board mutation clears `lastCheck`. Stale ticks on the view cards are a lie.
- `loadPuzzle` resets everything including `mode` and `rotation`.

Then write a headless test that solves `step-01` entirely through store actions and asserts `outcome === "solved"`. That test is the definition of done for your half. It must pass before any UI exists.

---

## Session 5 — puzzle set

Six puzzles, `step-01` … `step-06`. Design them so each teaches one thing:

1. Two bricks flat, side by side. Top view is the whole answer.
2. Two bricks stacked. Front and top disagree — that's the point.
3. Three bricks, one rotated 90°. First time rotation is required.
4. An L in plan, one level. Right view is the informative one.
5. Two levels, four bricks, a step profile.
6. Six bricks with one brick fully enclosed — invisible in all three views. The child must notice the tray isn't empty.

Every puzzle must pass `validate-puzzles`. For puzzle 6, assert in a test that the enclosed brick's removal changes no projection but does change the cell set.

Keep boards at 6×6×5 unless a puzzle genuinely needs more. A big empty plate makes a small solid look lost.

---

## Working rules

- Commit after each session with a message naming the milestone.
- Run `npm test` before every commit. A red test on `main` blocks Antigravity.
- `git pull --rebase` before you start. Antigravity commits often.
- If you need something changed in `src/ui/` or `src/scene/`, write it under `## For Antigravity` in `HANDOFF.md` with today's date. Then continue. Do not wait, do not edit.
- Pure functions, no classes, no singletons outside the store, no runtime dependency in `src/core/` beyond TypeScript itself.
- Don't add error boundaries, logging, feature flags, or config layers. This is a six-puzzle toy.

## Review duty

When the human asks you to review Antigravity's work, check exactly three things and say nothing else:

1. Did any rule logic leak into a component? Coordinate maths, support checks, and count arithmetic all belong in `core/` or the store.
2. Does any string break spec §9?
3. Did anything edit a file it doesn't own?

Report findings as a list of file and line. No praise, no summary of what the code does.
