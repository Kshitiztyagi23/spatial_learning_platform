# Plan — Antigravity

**Model:** Gemini Flash 3.8. It's fast and it drifts, so every task below is scoped to one file and ends at a screenshot. Don't batch tasks. Don't let it refactor something it wasn't asked about.

**You own:** everything the child sees. The 3D scene, the tray, the view cards, the toolbar, the layout, the CSS.

**You do not own:** `src/core/`, `src/state/`, `src/data/`, `scripts/`. Claude Code is editing those live. Import from them, never edit them. If a function you need is missing or wrong, write it under `## For Claude Code` in `HANDOFF.md` and stub around it locally.

Read `00-SHARED-SPEC.md` first. It is binding. `src/core/types.ts` is your API.

---

## Design direction

Decide this before writing CSS, then hold it.

The concept is **drafting table meets brick bin**. The three views are flat orthographic drawings — technical, quiet, drawn on grid paper. The board is the opposite: glossy, saturated, physical. All the colour in the app belongs to the bricks. Everything else stays out of their way.

The room this belongs in is a primary classroom in daylight. Bright surface, dark text, one bright object at a time.

**Palette**

| Token | Value | Use |
|---|---|---|
| `--desk` | `#DCE3EA` | app background, the tabletop |
| `--stage` | `#E8EDF3` | flat backdrop behind the 3D board |
| `--sheet` | `#FFFFFF` | panels, view cards |
| `--rule` | `#B7C1CC` | grid lines on cards, panel borders |
| `--ink` | `#1B2231` | text |
| `--quiet` | `#55616F` | labels, counts, hints |
| `--filled` | `#48566A` | filled squares in a view card |
| `--match` | `#1F8A4C` | view card matches |
| `--miss` | `#B8502E` | view card doesn't match |

Brick red `#E3000B`, blue `#1F7AE0`, yellow `#F4B71E` appear only on bricks and their tray icons. Nowhere else. Not on buttons, not on borders.

Not this, under any circumstances: a dark or near-black background, neon or acid colours, glow or bloom, anything that reads as a terminal, a HUD, or a sci-fi interface. If a screenshot would look at home in a hacking scene, it's wrong.

Also avoid the other direction's defaults: no warm cream background, no terracotta accent, no gradient washes. Don't put a soft grey drop shadow under every card. Shadows exist on the board and on bricks, because those objects are physically above a surface; flat UI panels get a 1px `--rule` border instead.

**Type**

One family: **Atkinson Hyperlegible Next**, self-hosted via `@fontsource-variable/atkinson-hyperlegible-next`. The CSS family name for that package is `Atkinson Hyperlegible Next Variable` — use that exact string or it silently falls back to system-ui. Weights 400 and 700. It was drawn for readers who need letterforms to be unmistakable, which is exactly a seven-year-old reading alone. Tray counts use tabular figures.

Scale: 13 / 15 / 18 / 24px. Sentence case everywhere. No all-caps labels. No eyebrow text above headings.

**Layout**

Desktop, three columns, the board dominant:

```
┌──────────────────────────────────────────────────────────┐
│  Puzzle 3 of 6 · Steps            [ ‹ ]  [ › ]           │
├────────────┬─────────────────────────────┬───────────────┤
│  BRICKS    │                             │   FRONT       │
│  ┌──────┐  │                             │  ┌─────────┐  │
│  │ ▪▪ 2 │  │                             │  │ ░░█░    │  │
│  │ ▪▪   │  │        3D BOARD             │  └─────────┘  │
│  └──────┘  │                             │   RIGHT       │
│  ┌──────┐  │                             │  ┌─────────┐  │
│  │ ▪▪▪ 1│  │                             │  │ ░█░     │  │
│  └──────┘  │                             │  └─────────┘  │
│            │                             │   TOP         │
│  [Rotate]  │                             │  ┌─────────┐  │
│            │  Front ▾  Right  Top  3D    │  │ ██░     │  │
│  [Erase]   │                             │  └─────────┘  │
├────────────┴─────────────────────────────┴───────────────┤
│  Match all three views.              [ Clear ] [ Check ] │
└──────────────────────────────────────────────────────────┘
```

Desktop only. The layout holds from 1024px up to 1920px: tray column fixed at 200px, views column fixed at 240px, board takes the rest. Below 1024px show a single line — `Open this on a larger screen.` — and nothing else. Don't reflow, don't stack, don't build a fallback.

The whole app fits one screen. Nothing scrolls except the tray column, and only if a puzzle ever needs more than four brick types.

Keyboard, since this is a mouse-and-keyboard app: `R` rotates, `1`–`3` select a brick type, `E` toggles Erase, `Enter` checks, `←`/`→` change puzzle. Visible focus ring on every control, `--ink` at 2px. Hover states are allowed on buttons and tray items — cursor exists here.

**Motion**

One orchestrated moment: the brick drops the last 0.3 units and settles, and at the same instant the tray count steps down. That's it. No card hover transitions, no fade-and-slide entrances, no pulsing. Respect `prefers-reduced-motion` by cutting the drop, not by disabling the count change.

---

## Task list

Each task is one commit. Screenshot at the end of each. Compare against the wireframe before moving on.

### A1 — tokens and shell
`src/styles/tokens.css`, `src/styles/global.css`, `App.tsx` skeleton with the three regions as empty bordered boxes. Load the font. Get the three-column grid right with nothing in it. Screenshot at 1280px and 1920px.

### A2 — stage and camera
`scene/Stage.tsx`, `scene/CameraRig.tsx`, `scene/Baseplate.tsx`.

Board size comes from `derived.puzzle.board`. Plate centred, faint grid lines, a `FRONT` marker along the +z edge. Orbit by drag, four preset buttons (Front, Right, Top, 3D) that ease the camera rather than jumping. Reuse the easing from the v2 prototype — `theta += (target - theta) * 0.18` per frame felt right.

Clamp the polar angle so the child can't get under the plate.

Screenshot from all four presets. The `FRONT` marker must be legible in the Front preset and readable-not-mirrored in the 3D preset.

### A3 — bricks
`scene/BrickMesh.tsx`, `scene/PlacedBricks.tsx`.

A brick is a box scaled to its footprint plus four studs per 2×2 of footprint area. Studs are decorative — set `raycast` to a no-op on them so a tap on a stud hits the box beneath.

Render from a hardcoded `Placement[]` first. Only wire to `useSession` once the shape looks right.

### A4 — tray
`ui/Tray.tsx`, `ui/TrayItem.tsx`.

One item per type present in `derived.tray`. Each shows a small isometric icon of the brick in its own colour, the label from `PIECES`, and the remaining count. Selecting sets `selectedType`. An item at zero goes to 40% opacity and stops responding — it stays in place rather than disappearing, so the tray doesn't reflow under the child's finger.

The icon is an SVG you draw, not a second three.js canvas.

Selected state: 2px `--ink` outline plus the brick's own colour as the fill. Don't add a checkmark.

### A5 — placement
`scene/pointer.ts`, `scene/GhostBrick.tsx`.

Raycast against the plate and the placed bricks. A hit on the plate gives cell `(round(x), 0, round(z))`. A hit on a brick face gives the neighbouring cell along the face normal.

Ask the store's `canPlace` path — never re-implement support or overlap rules here. Ghost is green when legal, red when not, hidden when there's no candidate or no selected type.

Drag versus click: more than 4px of movement between press and release is a camera drag, not a placement. The v2 prototype's pointer handling already does this correctly — take it as-is.

`Rotate` turns the ghost 90° and nothing else. In Erase mode, hovering a brick highlights it and tapping removes it.

### A6 — view cards
`ui/ViewCard.tsx`, `ui/ViewsRow.tsx`.

Render `derived.viewGrids[name]` directly. Filled squares are `--filled`, empty squares are `--sheet` with a `--rule` border. Squares are 22px with a 3px gap. Label under the card in `--quiet`.

After Check, the card gets a `--match` or `--miss` border and a one-word status under the label. Before Check, no status at all — do not show a neutral or pending state.

The right-side card is the one that will look wrong. Build a puzzle that's asymmetric on every axis and check it against the board by eye from the Right preset.

### A7 — feedback and chrome
`ui/Toolbar.tsx`, `ui/PuzzleBar.tsx`, `ui/Feedback.tsx`.

Feedback strings, exactly these:

| Situation | String |
|---|---|
| `empty` | Place some bricks first. |
| `views-mismatch` | Check the views marked in orange. |
| `hidden-brick` | The views match, but a brick is missing inside. |
| `solved` | That's the shape. |
| `out-of-bounds` | That brick goes off the board. |
| `overlap` | Another brick is already there. |
| `unsupported` | That brick needs something under it. |
| `none-left` | No more of that brick. |
| `load-bearing` | Take off the brick on top first. |

Reject messages appear near the board for two seconds. Check results stay until the child next clicks the board.

When solved, the `Next puzzle` button becomes the only bright thing on screen. Nothing else changes — no confetti, no banner across the board, no sound.

### A8 — desktop pass
Test at 1280×800 and 1920×1080. Check that the board never gets letterboxed on resize, that every keyboard shortcut works, that focus rings are visible on all controls, and that the small-window message appears below 1024px. Screenshot each width.

---

## Working rules

- One task per session. Start it by re-reading spec §9, end it with a screenshot.
- `git pull --rebase` before you start. Claude Code commits often.
- Import types from `@/core/types`. Never redefine a type locally, never widen one with `any`.
- No rule logic in a component. If you're writing `y - 1` or counting cells inside a `.tsx` file, stop — that belongs in `core/`, so file it in `HANDOFF.md`.
- No new dependencies without asking. Not for icons, not for animation, not for layout.
- Delete any code you wrote for a hardcoded stub once the store is wired. Don't leave the stub behind a flag.

## Self-check before each commit

1. Does anything on screen use a brick colour that isn't a brick?
2. Is there a string a seven-year-old would stumble on?
3. Is there praise, an exclamation mark, or an emoji anywhere?
4. Does a shadow sit under something that isn't physically above a surface?
5. Would this screenshot look like a tool for a programmer rather than a toy for a child?
6. Did I touch a file I don't own?
