# Brick Views

A child rebuilds a solid from three flat views — front, right, top — using bricks from a tray on a 3D baseplate, then checks their work.

The spec is binding: [`../00-SHARED-SPEC.md`](../00-SHARED-SPEC.md). Ownership of files between the two agents working this repo is in [`OWNERSHIP.md`](./OWNERSHIP.md); cross-side requests go in [`HANDOFF.md`](./HANDOFF.md).

## Run

```
npm install
npm run dev
```

## Test

```
npm test
```

Runs the Vitest suite, then validates every puzzle under `src/data/puzzles/` by replaying its solution through the placement rules (`scripts/validate-puzzles.ts`). A red test blocks `main`.

## Build

```
npm run build
```
