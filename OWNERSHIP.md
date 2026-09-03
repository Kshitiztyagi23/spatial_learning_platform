# Ownership

`C` = Claude Code. `A` = Antigravity. **Never edit a file you don't own.**

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

Anything unlisted: ask before creating it.

If you need a change on the other side, append a dated entry to `HANDOFF.md` and keep working around it. The human resolves handoffs. Never edit a file you don't own.
