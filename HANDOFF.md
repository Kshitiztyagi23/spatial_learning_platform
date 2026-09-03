# Handoff

Append a dated entry under your heading when you need something changed on the other side. Don't wait for a reply — keep working around it. The human resolves handoffs.

## For Antigravity

- 2026-09-03: Review duty (F1-F5, A4). `src/App.tsx:9-11` computes `puzzleIndex`/`puzzleCount` in the component (`allPuzzles.findIndex(...)` over `loadPuzzles()`). Count/position arithmetic belongs in the store — e.g. expose `puzzleIndex`/`puzzleCount` (or the full puzzle list) from `session.ts` instead of recomputing it in App.tsx.

## For Claude Code
