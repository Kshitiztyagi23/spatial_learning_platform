# Handoff

Antigravity is retired; this is no longer a cross-agent handoff file. Kept as a running log of decisions and deferred work.

## Log

- 2026-09-03: Resolved. `puzzleIndex`/`puzzleCount` (and `nextPuzzle`/`prevPuzzle`) moved into `session.ts`; `PuzzleBar.tsx` now reads them from the store instead of searching `loadPuzzles()`. See `00-SHARED-SPEC.md` §6.
- 2026-09-03: A8 desktop pass, verified by code inspection only (no browser available this session):
  - Board resize: `Canvas` has no fixed `width`/`height`/`aspect` props; `.stage-container`/`.app-board-region` are 100%/100% with `min-width:0` in the grid, no `aspect-ratio` anywhere in global.css. r3f's default resize handling should keep the canvas filling its container without letterboxing, but this needs an actual window-drag to confirm.
  - Focus rings: no `outline: none` anywhere; every interactive control is a real `<button>`, and the universal `:focus-visible { outline: var(--focus-ring) }` rule is the last rule in the cascade, so it wins over `.active`/`.selected` outlines. Needs a real Tab-through to confirm nothing visually swallows it.
  - Sub-1024px message: `App.tsx` checks `window.innerWidth >= 1024` on mount and on resize, rendering `.screen-fallback` (verified present with correct copy). Not re-verified in an actual narrow window.
  - 640px minimum height: `.app-shell` has `min-height: var(--app-min-height)` = 640px; `box-sizing: border-box` is global so padding doesn't push it over. Below 640px the shell just clips under `body { overflow: hidden }` rather than reflowing — matches the plan's "desktop only, no responsive breakpoints" intent, not re-verified visually.
  - Not verified at all (needs eyes on a screen): actual visual layout at 1280x800 and 1920x1080, whether the FRONT marker's new flat-plane placement reads correctly from the Front/Top/3D presets, keyboard shortcuts firing correctly in a live browser, and general visual polish of the A7 chrome rebuild (PuzzleBar nav arrows, Toolbar's Clear board placement).
