# Ownership

Antigravity is retired. Claude Code owns the entire codebase — every file below, with no per-file split.

```
brick-views/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── OWNERSHIP.md
├── HANDOFF.md
├── scripts/
│   └── validate-puzzles.ts
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── core/
    │   ├── types.ts      (frozen contract)
    │   ├── pieces.ts
    │   ├── geometry.ts   cellsFor, footprintFor, brickAtCell
    │   ├── placement.ts  canPlace, canRemove
    │   ├── projection.ts projectCells, toGrids
    │   ├── puzzle.ts     derivePuzzle, validate, loader
    │   ├── check.ts
    │   └── __tests__/
    ├── state/
    │   └── session.ts
    ├── data/puzzles/
    │   └── *.json
    ├── scene/
    │   ├── Stage.tsx        canvas, lights, resize
    │   ├── CameraRig.tsx    orbit + front/right/top/3D presets
    │   ├── Baseplate.tsx    plate, grid lines, FRONT marker
    │   ├── BrickMesh.tsx    box + four studs
    │   ├── PlacedBricks.tsx
    │   ├── GhostBrick.tsx
    │   ├── SceneInteraction.tsx
    │   └── pointer.ts       raycast → cell
    ├── ui/
    │   ├── Tray.tsx
    │   ├── TrayItem.tsx
    │   ├── IsometricBrickIcon.tsx
    │   ├── ViewCard.tsx
    │   ├── ViewsRow.tsx
    │   ├── Toolbar.tsx
    │   ├── PuzzleBar.tsx
    │   └── Feedback.tsx
    └── styles/
        ├── tokens.css
        └── global.css
```

`HANDOFF.md` still exists as a running log of decisions and deferred work, not as a cross-agent handoff.
