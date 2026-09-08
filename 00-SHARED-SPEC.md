# Brick Views — Shared Spec

Read this before starting. Both agents build against it. Neither agent may change anything in this file without the human's approval.

---

## 1. What the app is

A child is shown three flat views of a solid — front, right side, top. They rebuild that solid on a 3D baseplate using bricks from a tray. When they think it's done, they press Check.

The tray holds only the bricks the solution actually uses, in exactly the right counts. Placing a brick decrements its count. Removing one puts it back.

**In scope for v1:** brick tray with counts, 90° rotation before placing, place/remove on a 3D board, three reference views, a Check that reports which views match.

**Audience:** children roughly 6 to 10, often in a classroom, sometimes on a shared machine. The screen should read as a bright work surface. No dark mode, no neon or glow, no saturated accents on dark backgrounds, no monospace type, no terminal or game-HUD styling. The saturated colour in this app belongs to the bricks and nothing else.

**Target:** desktop and laptop browsers, mouse and keyboard. Assume a window at least 1024px wide. Build no touch handling, no responsive breakpoints below that, no phone or tablet layout. Pointer events are fine as the input API — just don't design for fingers.

**Out of scope for v1:** scoring, stars, timers, streaks, accounts, persistence, sound, difficulty progression, analytics, mobile support. Do not build these. Do not leave stubs, TODOs, or commented-out scaffolding for them.

AI-assisted feedback and a minimal backend are in scope as of 2026-09-08 (human-approved amendment) — see §5a.

---

## 2. Coordinates

One convention, used everywhere, no exceptions.

```
x → right
y → up
z → toward the viewer (the FRONT edge of the board)
```

Cells are integers. Cell `(0,0,0)` is the back-left cell sitting on the plate. A brick occupying cell `(x,y,z)` has its centre at world position `(x, y + 0.5, z)`.

Projections:

| View  | Camera looks along | Cell `(x,y,z)` maps to |
|-------|--------------------|------------------------|
| front | −z                 | `(x, y)`               |
| right | −x                 | `(z, y)`               |
| top   | −y                 | `(x, z)`               |

**Display orientation** — get this right once and never touch it again:

- front grid: row 0 is the highest `y`, column 0 is the lowest `x`.
- right grid: row 0 is the highest `y`, column 0 is the **highest** `z`. (Standing to the right of the board, the front edge is on your left.)
- top grid: row 0 is the lowest `z` (front edge at the top of the card), column 0 is the lowest `x`.

Write a test for the right-side flip. It is the bug that will otherwise cost a day.

---

## 3. Bricks

Three types. All are 1 unit tall.

| id    | footprint at rotation 0 | colour    | tray label |
|-------|-------------------------|-----------|------------|
| `2x2` | 2 wide (x) × 2 deep (z)  | `#E3000B` | 2 × 2      |
| `2x3` | 2 wide × 3 deep          | `#1F7AE0` | 2 × 3      |
| `2x4` | 2 wide × 4 deep          | `#F4B71E` | 2 × 4      |

Colour is fixed per type. Every 2×3 in the world is the same blue. This makes the tray legible and lets a child say "the blue one".

**Rotation:** `0 | 90 | 180 | 270`, around the y axis only. Bricks never tip onto a side face. Rotating 90° swaps width and depth. For rectangles only two footprints exist, but keep all four states so the rotate button always turns the preview and never feels dead.

**Placement rules:**
1. Every cell must be inside the board.
2. No cell may overlap an occupied cell.
3. Every cell must be supported — either resting on the plate (`y === 0`) or directly above an occupied cell. Full support, not partial. No overhangs in v1.
4. The tray must have at least one of that type left.

**Removal:** tapping a placed brick in Erase mode removes the whole brick and returns it to the tray. Bricks with something resting on them cannot be removed; the app says so rather than silently ignoring the tap.

---

## 4. Puzzles

A puzzle is authored as its solution. Everything else is derived, so the tray can never disagree with the answer.

```jsonc
{
  "id": "step-01",
  "name": "Two bricks",
  "hint": "The top view shows where the bricks sit on the board.",
  "board": { "width": 6, "depth": 6, "height": 5 },
  "solution": [
    { "instanceId": "a", "typeId": "2x4", "rotation": 0,  "origin": { "x": 1, "y": 0, "z": 1 } },
    { "instanceId": "b", "typeId": "2x2", "rotation": 90, "origin": { "x": 1, "y": 1, "z": 1 } }
  ]
}
```

`origin` is the minimum-corner cell of the brick's footprint **after** rotation.

Derived at load: the occupied cell set, the three view grids, and the tray counts (a tally of `typeId` across `solution`).

A puzzle is invalid if any placement breaks the rules in §3. The validator script fails the build on an invalid puzzle.

---

## 5. Check

Compare the child's build against the solution. Both sides are normalised first — shifted so their minimum x, y and z are 0 — so building the right shape in the wrong corner of the board still passes.

Three outcomes:

1. **Solved.** Normalised cell sets are identical.
2. **Views match, solid differs.** All three projections agree but the cell sets don't. Tell them a brick is hidden inside and point at the tray count.
3. **Views mismatch.** Mark each of the three view cards as matching or not. Say nothing about which brick is wrong — the views are the feedback.

The tray count is always visible, so "you still have bricks left" is information the child already has. Don't repeat it as an error unless case 2 applies.

---

## 5a. Help (AI-assisted feedback)

Amended 2026-09-08, human-approved — supersedes §1's original "no backend, no AI hints" line.

On a failed Check (`views-mismatch` or `hidden-brick`), two independent layers:

1. **Highlighting — deterministic, no AI, no backend.** `check()` returns `wrongInstanceIds`: instanceIds of placed bricks occupying a cell the solution doesn't use, found by exact cell-set comparison, never inferred by a model. The scene tints those bricks the existing "wrong" red (`#B8502E`, the same token already used for erase-hover and illegal ghost placement). Ships and runs with zero network calls.
2. **"Get help" — AI, on demand only.** A button shown only after a failed Check; never fires automatically. It calls a backend endpoint (the API key never ships to the client) with a small structured payload — puzzle hint, which views fail, which brick *types* are extra or missing — never raw coordinates and never the full solution. The model turns that into one short sentence following §9's writing rules. The model narrates a diagnosis `check()` already computed; it never does the spatial reasoning itself.

On timeout or error, fall back to the existing static per-outcome message. The core Check loop never depends on the network.

---

## 6. The contract

This is the file that lets two agents work at once. Claude Code writes it first, in the first session, before anything else. Antigravity imports from it and never edits it.

`src/core/types.ts`

```ts
export type Vec3 = { x: number; y: number; z: number };
export type Rotation = 0 | 90 | 180 | 270;
export type PieceTypeId = "2x2" | "2x3" | "2x4";

export interface PieceType {
  id: PieceTypeId;
  width: number;   // along x at rotation 0
  depth: number;   // along z at rotation 0
  color: string;   // hex
  label: string;   // "2 × 3"
}

export interface Placement {
  instanceId: string;
  typeId: PieceTypeId;
  rotation: Rotation;
  origin: Vec3;    // min-corner cell after rotation
}

export interface BoardSize { width: number; depth: number; height: number }

export interface Puzzle {
  id: string;
  name: string;
  hint: string;
  board: BoardSize;
  solution: Placement[];
}

/** "x,y,z" keys */
export type CellSet = Set<string>;
/** "a,b" keys, meaning depends on the view — see spec §2 */
export type ViewSet = Set<string>;

export interface Views { front: ViewSet; right: ViewSet; top: ViewSet }
export type ViewName = keyof Views;

export interface DerivedPuzzle {
  puzzle: Puzzle;
  cells: CellSet;
  views: Views;
  /** row-major booleans, already in display orientation */
  viewGrids: Record<ViewName, boolean[][]>;
  tray: Record<PieceTypeId, number>;
}

export type RejectReason =
  | "out-of-bounds"
  | "overlap"
  | "unsupported"
  | "none-left"
  | "load-bearing";   // removal only

export type PlaceResult = { ok: true } | { ok: false; reason: RejectReason };

export type CheckOutcome = "solved" | "hidden-brick" | "views-mismatch" | "empty";

export interface CheckResult {
  outcome: CheckOutcome;
  views: Record<ViewName, boolean>;
  bricksPlaced: number;
  bricksTotal: number;
  /** instanceIds of placed bricks occupying a cell the solution doesn't use */
  wrongInstanceIds: string[];
}
```

Function signatures Claude Code must implement (in `src/core/`):

```ts
cellsFor(typeId: PieceTypeId, rotation: Rotation, origin: Vec3): Vec3[]
footprintFor(typeId: PieceTypeId, rotation: Rotation): { w: number; d: number }
derivePuzzle(puzzle: Puzzle): DerivedPuzzle
canPlace(placed: Placement[], board: BoardSize, tray: Record<PieceTypeId, number>,
         typeId: PieceTypeId, rotation: Rotation, origin: Vec3): PlaceResult
canRemove(placed: Placement[], instanceId: string): PlaceResult
brickAtCell(placed: Placement[], cell: Vec3): Placement | null
projectCells(cells: Vec3[]): Views
toGrids(views: Views, board: BoardSize): Record<ViewName, boolean[][]>
check(placed: Placement[], target: DerivedPuzzle): CheckResult
```

Store shape (`src/state/session.ts`, zustand):

```ts
interface Session {
  derived: DerivedPuzzle;
  placed: Placement[];
  remaining: Record<PieceTypeId, number>;
  selectedType: PieceTypeId | null;
  rotation: Rotation;
  mode: "build" | "erase";
  lastCheck: CheckResult | null;
  lastReject: RejectReason | null;
  puzzleIndex: number;   // position of `derived.puzzle` in the loaded catalog, 0-based
  puzzleCount: number;   // size of the loaded catalog

  loadPuzzle(id: string): void;
  selectType(id: PieceTypeId | null): void;
  rotateCW(): void;
  place(origin: Vec3): void;
  removeAt(cell: Vec3): void;
  clearBoard(): void;
  runCheck(): void;
  dismissFeedback(): void;
  nextPuzzle(): void;   // wraps to the first puzzle after the last
  prevPuzzle(): void;   // wraps to the last puzzle before the first
}
```

`place` and `removeAt` call into `core/` and set `lastReject` on failure. Components read state and call actions. **No rule logic in a component, ever.** That includes puzzle-catalog position: nothing outside `session.ts` searches the puzzle list or does index arithmetic on it. `nextPuzzle`/`prevPuzzle` are the only way a component changes which puzzle is loaded by relative position; `loadPuzzle(id)` remains for loading by id directly.

---

## 7. File layout and ownership

```
brick-views/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── OWNERSHIP.md
├── HANDOFF.md
├── scripts/
│   └── validate-puzzles.ts          C
└── src/
    ├── main.tsx                     A
    ├── App.tsx                      A
    ├── core/
    │   ├── types.ts                 C  (frozen contract)
    │   ├── pieces.ts                C
    │   ├── geometry.ts              C  cellsFor, footprintFor, brickAtCell
    │   ├── placement.ts             C  canPlace, canRemove
    │   ├── projection.ts            C  projectCells, toGrids
    │   ├── puzzle.ts                C  derivePuzzle, validate, loader
    │   ├── check.ts                 C
    │   └── __tests__/               C
    ├── state/
    │   └── session.ts               C
    ├── data/puzzles/
    │   └── *.json                   C
    ├── scene/
    │   ├── Stage.tsx                A  canvas, lights, resize
    │   ├── CameraRig.tsx            A  orbit + front/right/top/3D presets
    │   ├── Baseplate.tsx            A  plate, grid lines, FRONT marker
    │   ├── BrickMesh.tsx            A  box + four studs
    │   ├── PlacedBricks.tsx         A
    │   ├── GhostBrick.tsx           A
    │   └── pointer.ts               A  raycast → cell
    ├── ui/
    │   ├── Tray.tsx                 A
    │   ├── TrayItem.tsx             A
    │   ├── ViewCard.tsx             A
    │   ├── ViewsRow.tsx             A
    │   ├── Toolbar.tsx              A
    │   ├── PuzzleBar.tsx            A
    │   └── Feedback.tsx             A
    └── styles/
        ├── tokens.css               A
        └── global.css               A
```

`C` = Claude Code owns. `A` = Antigravity owns. **Never edit a file you don't own.** If you need a change on the other side, append a dated entry to `HANDOFF.md` and keep working around it. The human resolves handoffs.

Anything unlisted: ask before creating it.

---

## 8. Stack

Vite + React 18 + TypeScript (strict) + `@react-three/fiber` + `@react-three/drei` + `zustand` + Vitest. Plain CSS with custom properties in `tokens.css` — no Tailwind, no component library, no CSS-in-JS.

Why this and not the single-file three.js prototype: the tray, counts and view cards are real UI that wants to re-render from state, and two agents cannot edit one 400-line HTML file at the same time. React gives a clean seam between the rules (Claude Code) and the surface (Antigravity), and r3f keeps the 3D scene declarative so it lives on the same side of that seam as the rest of the UI.

The v2 prototype is reference only. Reuse its projection maths, its orbit feel and its palette. Do not copy its file structure.

---

## 9. Writing rules

Every word a child reads goes through this.

- Short sentences. Aim at a seven-year-old reading alone.
- Say what happened and what to do. "The top view doesn't match yet." not "Oops! Not quite — keep trying!"
- No praise words: great, awesome, nice work, well done, perfect, amazing. Solving it is the reward; the app doesn't applaud.
- No exclamation marks. No emoji in instructions, labels, or feedback.
- Buttons name their action: `Check`, `Rotate`, `Clear board`, `Next puzzle`. Not `Submit`, not `Let's go`.
- One job per string. Hints under 12 words. Button labels under 3.
- The same action keeps the same name everywhere.
- Errors don't apologise and are never vague. `That brick needs something under it.`

Empty tray, wrong view, blocked placement — all are directions, not moods.

---

## 10. Milestones

| # | What exists | Who |
|---|-------------|-----|
| M0 | Repo, deps, `types.ts`, `OWNERSHIP.md`, `HANDOFF.md`, one fixture puzzle | C |
| M1 | Core engine passing tests; store works headless | C |
| M2 | Board renders, camera presets work, bricks appear from a hardcoded list | A |
| M3 | Tray → select → rotate → ghost → place → count drops; erase works | both |
| M4 | View cards render from `viewGrids`; Check reports per view | both |
| M5 | Six puzzles, next/previous, feedback strings, keyboard shortcuts, window resize | both |

M0 and M1 are Claude Code alone. Antigravity starts M2 as soon as `types.ts` and the fixture exist — against a stub store, not the real one.
