# Plan 03 — Colour, a bigger brick catalogue, and hints that don't give it away

Status: **decisions taken 2026-09-09** (see §9). Amends `00-SHARED-SPEC.md` §1,
§3, §5, §5a and the `types.ts` contract in §6. Two open questions remain (§9,
Q5–Q6) but neither blocks Phase 0.

---

## 0. What this changes, and what it breaks

Five asks, in dependency order:

1. Colour becomes part of correctness (same shape, wrong colour = wrong).
2. More bricks, more colours, more levels.
3. Failed-check feedback becomes a **graded ladder** that hints without naming a brick.
4. An explicit line between what the AI does and what the app decides.
5. The three view cards show the **actual coloured views**, not grey silhouettes.

Three of these collide with the spec as written. Flagging up front, because
these are human decisions, not implementation details:

| Spec today | This plan | Why |
|---|---|---|
| §3 "Colour is fixed per type. Every 2×3 is the same blue." | Colour becomes an independent axis of the piece id. | You cannot make colour load-bearing for correctness while it is a function of shape. |
| §5a layer 1: `check()` returns `wrongInstanceIds`, the scene **tints wrong bricks red** on every failed check. | **Demoted to rung 5**: behind an explicit "Show me", four failures deep, revealing **one cell** rather than a whole brick. `wrongInstanceIds` itself is deleted — rung 5 reuses the mismatched-cell list `diagnose()` already computes for regions. | This is the "tells you which block" behaviour you want gone, but a stuck child still needs a floor. Opt-in and one cell is the floor. |
| §5 case 3 "Say nothing about which brick is wrong — the views are the feedback." | Kept and strengthened. The ladder never names a brick; it names a **view and a region**. | The spec already had the right instinct; §5a walked it back. This plan restores it. |

Note the internal contradiction that already exists: §5 says say nothing about
which brick is wrong, §5a tints the wrong bricks red. Your request resolves it
in favour of §5.

---

## 1. Phase 0 — The contract (`types.ts`, `pieces.ts`)

Must land **first, alone, on its own branch**. Everything else depends on it and
nothing else can be written in parallel with it.

### Piece identity splits in two

```ts
export type ShapeId  = "1x1" | "1x2" | "1x3" | "1x4" | "2x2" | "2x3" | "2x4" | "2x6";
export type ColorId  = "red" | "blue" | "yellow" | "green" | "white";
/** Composite. Stays a plain string so Record<PieceTypeId, number> keeps working. */
export type PieceTypeId = `${ShapeId}-${ColorId}`;

export interface PieceType {
  id: PieceTypeId;
  shape: ShapeId;
  color: ColorId;
  width: number;      // along x at rotation 0
  depth: number;      // along z at rotation 0
  hex: string;        // render colour
  label: string;      // "Red 2 × 4"  — colour word first, spec §9
}
```

Why a composite string and not a `{shape, color}` object: every tray in the
codebase is `Record<PieceTypeId, number>` — `session.remaining`,
`DerivedPuzzle.tray`, and `canPlace`'s tray argument. A composite key keeps all
of that working unchanged and keeps the puzzle JSON flat. The cost is one lookup
helper; the alternative is touching every tray site in the app.

**Cascade — every one of these is currently hardcoded to the three old ids:**

- `core/pieces.ts` — `PIECES` becomes generated from a shape table × a colour
  table, not 8 × 5 = 40 handwritten literals.
- `core/puzzle.ts:emptyTray()` — hardcodes `{"2x2":0,"2x3":0,"2x4":0}`. Derive
  from `Object.keys(PIECES)`, or better, build the tray from the solution tally
  alone and drop the pre-seeded zero map entirely.
- `ui/Tray.tsx` — hardcodes display order `['2x4','2x3','2x2']`. Becomes: sort
  the puzzle's present types by shape area descending, then by colour order.
- `App.tsx` keyboard `1`/`2`/`3` → `selectType('2x2'|'2x3'|'2x4')`. Becomes an
  index into the current tray, so `1`–`9` select the *n*th tray item of whatever
  this puzzle happens to use.
- `ui/TrayItem.tsx` — `selectedTextColor = typeId === '2x4' ? ...`. Becomes a
  luminance check on `piece.hex`.
- Every puzzle JSON's `typeId` values migrate (`"2x4"` → `"2x4-yellow"`),
  preserving today's shape→colour mapping so the existing six puzzles render
  identically.

### Shapes to add

Rectangles only, all 1 unit tall. `1x1, 1x2, 1x3, 1x4, 2x6` join the existing
three.

**Deliberately not adding L, T, or cross shapes this pass** (decided, Q4). `cellsFor`,
`footprintFor` and `originForPivot` all assume a w×d rectangle, and `BrickMesh`
renders a single box. Non-rectangles mean a cell-offset list per shape, rotation
maths that no longer reduces to swapping w and d, and multi-box meshes. That is
a second project. Upgrade path if you want it: `PieceType` grows
`cells: {dx,dz}[]`, `cellsFor` maps over it, `BrickMesh` renders one box per
cell. Say the word and it becomes Phase 4b.

### Colours

Five, chosen for a 6–10-year-old on a classroom projector and for red/green
colour blindness:

| id | hex | notes |
|---|---|---|
| `red` | `#E3000B` | existing |
| `blue` | `#1F7AE0` | existing |
| `yellow` | `#F4B71E` | existing |
| `green` | `#2E9E4F` | never the *only* partner of red in a puzzle — see the validator rule in §5 |
| `white` | `#F2F4F7` | needs a darker outline in `BrickMesh` to read against `--stage` |

Accessibility floor, not negotiable: the colour **word** goes in the tray label
and the `aria-label` (`"Red 2 × 4, 3 remaining"`). A child who cannot separate
red from green can still play by reading. This is the cheap version of the right
thing; do not skip it to save a string.

---

## 2. Phase 1 — The views as real renders

The requirement, stated exactly: **show the child how the 3D model actually
looks when looked at from that direction — shapes, colours and alignment
intact.** Not a diagram of it. The thing itself.

That rules out the coloured-cell grid this plan originally proposed. A grid
paints one square per occupied cell, so two adjacent red 2×2 bricks and one red
2×4 render identically — the *shape* information is destroyed at exactly the
point the child needs it. It also rules out image generation. What it wants is
an **orthographic render of the solution**, and the codebase already has every
piece of that.

### What already exists

- `scene/BrickMesh.tsx` draws a real brick: `boxGeometry args={[w - 0.03, 0.97, d - 0.03]}`
  — an explicit seam gap, called out in its own comment — plus one stud per
  footprint cell. Two adjacent red 2×2s and one red 2×4 are already visually
  distinct. Nothing new needs drawing.
- `scene/CameraRig.tsx` already has `front` / `right` / `top` / `3d` presets
  with the correct axis angles.
- `@react-three/drei` is already a dependency, so `<OrthographicCamera makeDefault>`
  is available with no new package.

### The build

`ui/ViewCard.tsx` stops rendering a CSS grid and renders a small `<Canvas>`:

```tsx
<Canvas frameloop="demand" gl={{ antialias: true, alpha: true }}>
  <OrthographicCamera makeDefault position={AXIS_POSITION[name]} zoom={...} />
  <ambientLight intensity={0.55} />
  <directionalLight position={[6, 12, 8]} intensity={0.5} />
  <PlacedBricks placements={target.puzzle.solution} />
</Canvas>
```

Three points, each of which is the lazy option:

- **`frameloop="demand"`** — each view renders one frame per puzzle load and
  then idles at zero cost. Three static canvases, not three animation loops.
- **`PlacedBricks` grows an optional `placements` prop**, defaulting to the store
  as today. One prop, no second component, no duplicated mesh code.
- **No `CameraRig`** in the view cards. They never orbit; a fixed
  `<OrthographicCamera>` on the axis is the whole camera.

Lighting must be flatter than the main stage (higher ambient, no shadows) or the
directional light shades two same-coloured bricks differently and invents a
distinction that is not there.

Fallback if four live WebGL contexts turn out to cost too much on a classroom
laptop: render each view once to a data URL and show an `<img>`. Do not build
that until a real machine complains — browsers allow ~16 contexts.

### The bug this uncovers

`scene/Stage.tsx` creates its canvas with `camera={{ fov: 45, ... }}` — a
**perspective** camera. So the main stage's own Front / Right / Top preset
buttons do not show orthographic views. They show perspective views with
converging edges and visible side faces.

In an app whose entire subject is orthographic projection, that means the child
presses "Front", compares it against the front view card, and sees two different
pictures. Fix in the same phase: swap to `<OrthographicCamera makeDefault>` when
`activePreset` is `front`, `right` or `top`, keeping perspective for `3d` where
the depth cue actually helps. `CameraRig`'s existing angle easing is unaffected.

### `core/projection.ts` still changes — for the grading, not the display

The colour projection is still needed, just not for painting cards:

```ts
/** "a,b" → ColorId. Same key space as ViewSet. */
export type ColorMap = Map<string, ColorId>;
export interface ColorViews { front: ColorMap; right: ColorMap; top: ColorMap }

export function projectColors(cells: { cell: Vec3; color: ColorId }[]): ColorViews
```

Front camera looks along −z (spec §2), so at each `(x,y)` the visible brick is
the one with the **largest z**. Right looks along −x → largest `x` wins. Top
looks along −y → largest `y` wins. One pass, three depth maps, keep-if-nearer.
`projectCells` becomes a two-line wrapper over the keys of `projectColors` —
deleting the duplicate loop rather than adding a parallel one.

`ColorViews` feeds the per-view Match/Miss badges and `diagnose()`'s region
maths. **`toColorGrids` is no longer needed at all** — display is a render now —
so it never gets written. `toGrids` stays for the silhouette diagnosis.

### Why not Nano Banana / image generation

The view cards *are* the answer key. A generated image cannot be verified
against `check()`, so a model that draws a 2×3 as a 2×4 silently breaks the
puzzle and no test catches it. It is also non-deterministic, slow, per-puzzle
paid, and needs caching. An orthographic render of the same `Placement[]` that
`check()` grades against is correct by construction, offline, and free — and it
reuses a mesh component that already exists.

Image generation is worth revisiting for exactly one thing: decorative level
thumbnails on a future level-select screen, where being slightly wrong costs
nothing. Not for the views.

### The orientation trap, in a new place

Spec §2 warns that the right-view z-flip "is the bug that will otherwise cost a
day", and makes `toGrids` write it down once. Moving the display to a camera
moves that trap rather than removing it: **the right view's orthographic camera
must sit at +x looking toward −x**, so the board's front edge falls on the
viewer's left. Point it from −x and every right view is mirrored, silently, with
`toGrids` still passing its own tests.

Guard it the same way the grid is guarded — one test asserting the rendered
camera basis matches `toGrids`'s column order for the right view. `AXIS_POSITION`
is three constants; derive them from the same convention table, do not hand-tune
them until the picture looks right.

### What the child now sees, and the cost of it

Accepted deliberately (Q3): **the view cards show the answer's colours.** Colour
correctness becomes a *reading* task rather than a *guessing* task — which is
what makes it learnable at all for a six-year-old. Deduction only kicks in for
sealed bricks (§3), which is exactly where it belongs.

---

## 3. Phase 2 — Colour-aware `check()` and the diagnosis

### The rule: grade the full colour map (decided, Q2)

A brick sealed inside the solid appears in no view. The instinct is that its
colour therefore cannot be graded fairly — but that is wrong here, and the
reason is the tray.

The tray holds **exactly** the solution's per-variant counts and those counts are
always on screen. So if a sealed slot wants yellow and the child puts green
there, the spare yellow has to go somewhere, and that somewhere is visible. The
error surfaces. A sealed colour is deducible by elimination, so grading it is
fair, and the child gets told the truth: that brick is in the wrong place.

That makes the rule the *simplest* of the options — one comparison, not two:

```
solved  ⟺  normalised cell → colour maps are equal
```

Cell-set equality is implied (equal maps have equal key sets), so this replaces
today's cell-set comparison rather than adding to it. `wrongInstanceIds` is
deleted in the same change; §5a layer 1 becomes rung 5 (§4).

### The one case elimination does not cover

Elimination fails when **two sealed bricks of different colours swap with each
other**. No view changes, the tray still balances, and nothing is deducible —
the child would be told they are wrong about something they could not possibly
have worked out.

This is a puzzle-authoring constraint, not a runtime one. The validator forbids
it in one line (§5 rule 4): **a puzzle may contain at most one distinct colour
among its fully-sealed bricks.** Any number of sealed bricks is fine as long as
they are all the same colour — which keeps `step-06` ("Six bricks", hint "A
brick may be hiding inside") alive untouched, since it is single-coloured today.

Cheaper than a constraint solver, and it makes every authored puzzle provably
deducible.

### `diagnose()` — the thing the ladder is made of

New pure function in `core/diagnose.ts`. Deterministic, testable, no AI.

```ts
export type DiagnosisCode =
  | "brick-count-low" | "brick-count-high"
  | "footprint-wrong"           // top silhouette differs
  | "height-wrong"              // tallest layer differs
  | "shape-right-colour-wrong"  // all 3 silhouettes match, >=1 colour view doesn't
  | "colour-swap"               // colour multiset matches, positions don't
  | "hidden-brick"              // views all match, cell sets don't
  | "region-mismatch";          // + which view, + a bounding box in that view

export interface Diagnosis {
  code: DiagnosisCode;
  view?: ViewName;
  /** bounding box of mismatched cells, in that view's DISPLAY grid coords */
  region?: { rowFrom: number; rowTo: number; colFrom: number; colTo: number };
}

/** Ranked coarsest-first. Index 0 is the vaguest true thing we can say. */
export function diagnose(placed: Placement[], target: DerivedPuzzle): Diagnosis[]
```

`CheckResult` gains `diagnoses: Diagnosis[]` and loses `wrongInstanceIds`.

The region is the bounding box of mismatched cells within one view grid. It says
*where to look* without saying *which brick* — and it sends the child back to
re-read the view, which is the entire pedagogical point of the app.

---

## 4. Phase 3 — The hint ladder

### Mechanic

No state machine, no hint engine. `session` gains `attempts: number`,
incremented by `runCheck()` and reset by `loadPuzzle` / `clearBoard`. The UI
renders `diagnoses.slice(0, attempts)`. That is the whole ladder: each failed
check reveals one more rung of an already-computed, already-ranked list.

### The rungs

| Attempt | What the child gets | Names a brick? |
|---|---|---|
| 1 | Per-view Match/Miss on the cards (today's behaviour, minus the red tint). "The top view doesn't match yet." | no |
| 2 | The *dimension* of the error. "The shape is right. The colours aren't." / "Your build is one layer too tall." | no |
| 3 | The *region*. A soft band over the mismatched rows/columns **on the view card**. "In the front view, look at the right side." | no |
| 4 | "Get help" appears. One AI sentence phrasing rungs 1–3 more concretely. | no |
| 5 | "Show me" — explicit, deliberate. Reveals **one** cell of difference on the board. The escape hatch so nobody is stuck. | one cell, not one brick |

Rungs 1–3 are free, offline, deterministic. Rung 4 is the only network call.
Rung 5 is the only thing approaching the old red-tint behaviour, and it is
opt-in, single-cell, and four failures deep.

Every rung has a static string keyed by `DiagnosisCode`. Those strings go through
spec §9 — short, no praise, no exclamation marks, under 12 words.

New UI: `ui/HintPanel.tsx` (replaces the single centre string in `Toolbar.tsx`),
plus a region-overlay layer inside `ui/ViewCard.tsx`.

---

## 5. Phase 4 — Bricks and levels

### Level bands (Q5, decided 2026-09-09, revised same day)

Two independent difficulty levers, not one: **brick count** and **whether colour
is visible at all**. Easy and Medium turn only the first lever. Hard turns the
second one instead of stacking more bricks on top — its brick range **deliberately
overlaps Medium's**, so `medium-02` (10 bricks, coloured) and `hard-01` (10
bricks, monochrome) are a matched pair that isolates exactly one variable. That
is a better difficulty curve than the one this section had a moment ago, which
only ever added bricks.

Six puzzles today, all `step-NN`, 2–6 bricks — kept unchanged (migrated to
explicit colour ids only) as a **Tutorial** tier below Easy, since none of them
reach the 5-brick floor below.

| Tier | ids | Count | Bricks per puzzle | Colour |
|---|---|---|---|---|
| Tutorial | `tut-01`…`tut-06` | 6 | today's six, unchanged (2–6) | coloured (today's shape→colour mapping) |
| Easy | `easy-01`…`easy-04` | 4 | 5, 6, 7, 8 | coloured |
| Medium | `medium-01`…`medium-04` | 4 | 9, 10, 11, 12 | coloured |
| Hard | `hard-01`…`hard-04` | 4 | 10, 11, 12, 13 *(overlaps Medium, on purpose)* | **monochrome** — every brick the same neutral grey, no colour to read at all |

`hard-*` was picked over the brief's own `d1`–`d4` shorthand to avoid colliding
with Band D below, which already owns `d-01`…`d-03`.

Colour, as *correctness* (wrong colour ≠ right colour, Phase 2), is a separate
thing again from colour as *reading aid*, removed above. It re-enters as three
further bands, unchanged from the original proposal, sitting on top of Hard
rather than interleaved with it:

| Band | ids | Count | Teaches | New in band |
|---|---|---|---|---|
| B — Colour | `b-01`…`b-05` | 5 | same shape, colour decides | two colours, ≤4 bricks, everything visible |
| C — Occlusion | `c-01`…`c-04` | 4 | a colour hidden behind another | 3 colours, one brick occluded in ≥1 view |
| D — Both | `d-01`…`d-03` | 3 | new shapes (1×N, 2×6) + 3–4 colours + a hidden brick | 6–9 bricks, board `height` 4+ |

30 puzzles total (18 shape-only + 12 colour). B/C/D do not yet have their own
brick-count sub-tiers — open, not blocking Phase 4: see [`TODO.md`](./TODO.md).

### The monochrome flag — what "all grey" costs to build

Hard is not the coloured tiers rendered in one colour; it needs a real, separate
mode, because colour is normally load-bearing for correctness (§3) and for the
view-card render (§2). Cheapest correct version: one field, checked in four
places, no new `ColorId`.

```ts
export interface Puzzle {
  // ...unchanged...
  /** true → every brick renders in one neutral hex; colour is not graded. */
  monochrome?: boolean;
}
```

- **Render** (`BrickMesh`, the view-card `<Canvas>` in §2, `TrayItem`): when the
  puzzle is monochrome, use one fixed hex instead of `piece.hex`. Reuse
  `tokens.css`'s existing `--filled` (`#48566A`) rather than inventing a sixth
  colour — it is already the "generic filled" token and nothing currently reads
  it for anything colour-graded.
- **`check()` (§3):** the colour-map comparison is *skipped* for a monochrome
  puzzle; `solved` falls back to plain cell-set equality — literally today's
  pre-Phase-2 rule, not a new branch, just a guard in front of the one added in
  §3.
- **`diagnose()` (§3):** never emits `shape-right-colour-wrong` or `colour-swap`
  for a monochrome puzzle — there is no colour to have gotten wrong.
- **Tray label / `aria-label`:** drops the colour word for a monochrome puzzle
  ("2 × 4" rather than "Red 2 × 4") — a label naming a colour the puzzle doesn't
  show would be actively misleading, not just redundant.
- **Validator (§5 below):** rules 1 and 4 (colour-blind fairness, sealed-colour
  deducibility) are colour rules and don't apply to a monochrome puzzle — skip
  them for it, rather than vacuously passing them.

### Validator additions (`scripts/validate-puzzles.ts`)

The script already replays every solution through the placement rules. It gains
four rules, each of which fails the build. Rules 1 and 4 are skipped for a
`monochrome` puzzle — they are colour rules and there is no colour to check.

1. **Colour-blind fairness** *(skipped if monochrome)*. No puzzle may use `red`
   and `green` as its only two colours.
2. **Solvability by reading.** Every visible brick's colour must appear in at
   least one colour view. Trivially true by construction — assert it anyway; it
   is the regression test for a `projectColors` depth-sort bug. For a monochrome
   puzzle this degenerates to "every visible brick is grey," which is
   tautologically true and costs nothing to still assert.
3. **Tray honesty.** The derived per-variant tray must equal the solution's
   variant tally.
4. **Sealed-colour deducibility** *(skipped if monochrome)* **(§3).** Compute the
   set of bricks contributing to no colour view. If that set contains two or
   more distinct colours, fail the build — the puzzle is unsolvable by
   elimination. Roughly:

   ```ts
   const sealed = solution.filter((p) => !appearsInAnyColorView(p));
   const colours = new Set(sealed.map((p) => PIECES[p.typeId].color));
   if (colours.size > 1) throw new Error(`${puzzle.id}: ${colours.size} sealed colours`);
   ```

---

## 6. Phase 5 — The AI layer

### The split, stated once

**Native, deterministic, never the model — anything that decides anything:**

- Whether the build is correct. Every branch of `check()`.
- Which views match.
- Whether a colour is wrong, and where.
- The mismatch region, and the ranking of diagnoses.
- Placement legality, tray counts, progression.
- The fallback text for every rung.

**The model, and only this:**

- Turning one already-computed `Diagnosis[]` into one sentence at a
  seven-year-old's reading level.
- On request only (rung 4), never automatically.

**The model never sees:** the solution, any raw coordinate, any `instanceId`, the
board contents, or the child's placements. It sees a diagnosis it did not compute
and cannot check.

This is not new policy — spec §5a already says "the model narrates a diagnosis
`check()` already computed; it never does the spatial reasoning itself." This plan
keeps that line exactly where it is and deletes the one thing sitting on the
wrong side of it.

### Wire format

Request:

```jsonc
{
  "puzzleHint": "The side view shows a part the front view hides.",
  "outcome": "views-mismatch",
  "viewsFailing": ["front", "right"],
  "diagnoses": [
    { "code": "shape-right-colour-wrong" },
    { "code": "region-mismatch", "view": "front", "region": "right side" }
  ],
  "attempt": 4
}
```

The region goes over the wire as a **word** (`"right side"`, `"top row"`,
`"middle"`), computed natively from the bounding box. Never numbers — numbers are
coordinates by another name.

Response: `{ "sentence": "..." }`, one sentence, ≤ 12 words.

### Non-negotiables

- 2-second timeout. On timeout or any error, fall back to the static string.
  Silent fallback — the child never sees a network error.
- Key lives server-side. One serverless function (Vercel or Cloudflare), not a
  server framework, not a service layer.
- **The app is fully playable with the network unplugged.** Classrooms. Rungs
  1–3 and 5 never touch the wire.
- The prompt carries spec §9 verbatim as its constraint block, plus three
  few-shot examples of a good sentence, plus a rejection rule: if the response
  contains a praise word, an exclamation mark, or exceeds 12 words, drop it and
  use the static string. **Validate the response natively — do not trust the
  model to follow the style rules.**

---

## 7. Sequencing, and running this in parallel with Antigravity

Phase 0 is the contract. It cannot be parallelised — it is the file both sides
import. Land it alone, get `npm test` green, then fan out.

```
Phase 0  (types.ts, pieces.ts, puzzle JSON migration)   -- solo, blocking
                    |
        +-----------+-----------+
        v                       v
  CLAUDE CODE                ANTIGRAVITY
  core/projection.ts         scene/BrickMesh.tsx   (per-variant material, white outline)
  core/check.ts              scene/PlacedBricks.tsx(optional `placements` prop)
  core/diagnose.ts           scene/Stage.tsx       (ortho camera on axis presets - the §2 bug)
  core/__tests__/            ui/ViewCard.tsx       (Canvas render + region overlay)
  state/session.ts           ui/HintPanel.tsx      (the ladder's surface)
  data/puzzles/*             ui/Tray.tsx           (variant ordering, colour words)
  scripts/validate-puzzles   ui/TrayItem.tsx       (luminance-based text colour)
  api/hint.ts                styles/tokens.css     (region-overlay token)
                    |
                    v
        Phase 3 integration (both) -> Phase 4 authoring -> Phase 5 AI
```

Phase 1 shifted weight to the Antigravity column: turning the view cards into
real renders (§2) is scene work, not core work. `core/projection.ts` still
changes, but only to feed grading.

Ownership: the human lifted the file restriction on 2026-09-09 — either agent may
edit any file. That removes the *permission* problem, not the *collision*
problem. Keep the column split above as a working convention for the duration of
this plan so two agents do not edit `ui/ViewCard.tsx` at once, and note in
`OWNERSHIP.md` that it is a convention now rather than a rule.

The seam that matters: Antigravity codes against `diagnose()`'s **types** before
its implementation exists. Ship the type signatures plus a stub returning `[]` in
Phase 0, so the UI side is never blocked on core.

---

## 8. Test plan

Extending the existing Vitest suite. No new framework.

| File | Adds |
|---|---|
| `projection.test.ts` | depth-sort per view (nearest wins: front = largest z, right = largest x, top = largest y); `projectCells` keys still equal `projectColors` keys |
| `viewcard-camera.test.ts` (new) | the three `AXIS_POSITION` constants agree with `toGrids`'s column order — the mirrored-right-view guard (§2) |
| `check.test.ts` | same shape + wrong **visible** colour → not solved; same shape + wrong **sealed** colour → **not** solved (Q2); colour-map equality under translation |
| `validate-puzzles.ts` | a synthetic puzzle with two differently-coloured sealed bricks fails rule 4; one with three same-coloured sealed bricks passes |
| `diagnose.test.ts` (new) | ranking is coarse→fine; region bounding box on a known mismatch; `shape-right-colour-wrong` fires only when all three silhouettes match |
| `puzzle-set.test.ts` | all 18 puzzles derive; all trays tally; no red+green-only puzzle |
| `solve-all.test.ts` | replay every solution → `outcome === "solved"` (already exists; catches every Phase 0 migration typo) |

`solve-all.test.ts` is the safety net for the whole `typeId` migration. Run it
first, run it often.

---

## 9. Decisions and remaining questions

### Decided 2026-09-09

**Q1 — the red tint: demoted to rung 5, one cell.** Not deleted. It becomes an
explicit "Show me" button, four failures deep, revealing a single mismatched cell
rather than a whole brick. `wrongInstanceIds` is still deleted from `CheckResult`;
rung 5 reads the mismatched-cell list `diagnose()` already computes. See §0, §4.

**Q2 — a sealed brick's colour is graded.** The tray is exact and always visible,
so a misplaced sealed brick forces a spare into a *visible* slot and the error
surfaces there. Grading is therefore fair, and it collapses the check to a single
cell→colour map comparison. The one case elimination cannot cover — two sealed
bricks of different colours swapping — is barred by validator rule 4 rather than
handled at runtime. See §3, §5.

**Q3 — view cards render in full colour.** Colour becomes a reading task; the
deduction load sits only on sealed bricks. See §2.

**Q4 — rectangles only this pass.** `1x1, 1x2, 1x3, 1x4, 2x6` join the existing
three. L/T/cross shapes are scoped as a separate Phase 4b with a named upgrade
path. See §1.

**Q5 — two difficulty levers, not one, decided 2026-09-09.** Tutorial (existing
6, unchanged), then Easy (5–8 bricks) and Medium (9–12 bricks) turn the
brick-count lever, coloured as normal. Hard turns the *other* lever instead:
10–13 bricks — **deliberately overlapping Medium** — rendered fully monochrome,
so colour stops being usable as a reading aid. `medium-02` and `hard-01` are
both 10 bricks, one coloured, one not: a matched pair, not a coincidence. New
`Puzzle.monochrome?: boolean` field carries this; full cascade (render, `check`,
`diagnose`, tray labels, validator) is in §5. Colour *as correctness* (Phase 2)
stays a separate axis, layered on afterward as bands B/C/D, unchanged.

### Still open (does not block Phase 0)

**Q6 — the attempt counter persists.** Decided 2026-09-09: the "no persistence"
line in spec §1 is lifted. `attempts` is keyed by puzzle id in `sessionStorage`,
so a child who reloads keeps the rung they had earned. `sessionStorage` rather
than `localStorage` on purpose — spec §1 says these are often shared classroom
machines, and the next child should start clean rather than inherit a stranger's
rung 4. Cleared on `clearBoard` and on solve.

Scope note, same date: the out-of-scope list in spec §1 is lifted generally, and
file ownership no longer restricts which files may be touched. That is a licence
to persist state and to edit across `core/` and `ui/` freely — **not** an
instruction to build the scoring, stars, timers, streaks or accounts that §1 also
listed. Those stay unbuilt until asked for.
