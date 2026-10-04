import { cellKey, cellsFor, minCorner, parseCellKey, setsEqual } from "./geometry";
import { diagnose } from "./diagnose";
import { PIECES } from "./pieces";
import { projectCells, projectColors } from "./projection";
import type { CheckResult, ColorId, DerivedPuzzle, Placement, ViewName, Vec3 } from "./types";

function withColor(cells: Vec3[], typeId: Placement["typeId"]): { cell: Vec3; color: ColorId }[] {
  return cells.map((cell) => ({ cell, color: PIECES[typeId].color }));
}

function aligned(placed: Placement[], target: Placement[]) {
  const placedRaw = placed.flatMap((p) => withColor(cellsFor(p.typeId, p.rotation, p.origin), p.typeId));
  const targetRaw = target.flatMap((p) => withColor(cellsFor(p.typeId, p.rotation, p.origin), p.typeId));
  const placedOffset = minCorner(placedRaw.map((c) => c.cell));
  const targetOffset = minCorner(targetRaw.map((c) => c.cell));
  const placedAligned = placedRaw.map(({ cell, color }) => ({
    cell: {
      x: cell.x - placedOffset.x + targetOffset.x,
      y: cell.y - placedOffset.y + targetOffset.y,
      z: cell.z - placedOffset.z + targetOffset.z,
    },
    color,
  }));
  return { placedAligned, targetRaw };
}

export function check(placed: Placement[], target: DerivedPuzzle): CheckResult {
  const bricksPlaced = placed.length;
  const bricksTotal = target.puzzle.solution.length;

  if (bricksPlaced === 0) {
    return {
      outcome: "empty",
      views: { front: false, right: false, top: false },
      bricksPlaced,
      bricksTotal,
      diagnoses: [],
    };
  }

  const { placedAligned, targetRaw } = aligned(placed, target.puzzle.solution);
  const placedCellKeys = new Set(placedAligned.map((c) => cellKey(c.cell)));
  const targetCellKeys = new Set(targetRaw.map((c) => cellKey(c.cell)));

  if (target.puzzle.monochrome) {
    // Colour is never graded here — plain cell-set equality, exactly the
    // pre-colour rule.
    if (setsEqual(placedCellKeys, targetCellKeys)) {
      return {
        outcome: "solved",
        views: { front: true, right: true, top: true },
        bricksPlaced,
        bricksTotal,
        diagnoses: [],
      };
    }

    const placedViews = projectCells([...placedCellKeys].map(parseCellKey));
    const targetViews = projectCells([...targetCellKeys].map(parseCellKey));
    const views: Record<ViewName, boolean> = {
      front: setsEqual(placedViews.front, targetViews.front),
      right: setsEqual(placedViews.right, targetViews.right),
      top: setsEqual(placedViews.top, targetViews.top),
    };
    const outcome = views.front && views.right && views.top ? "hidden-brick" : "views-mismatch";
    return { outcome, views, bricksPlaced, bricksTotal, diagnoses: diagnose(placed, target) };
  }

  // Colour-aware: solved iff the normalised cell→colour maps are equal —
  // equal maps imply equal cell sets, so this replaces (not adds to) the
  // cell-set check above.
  const placedColorMap = new Map(placedAligned.map((c) => [cellKey(c.cell), c.color]));
  const targetColorMap = new Map(targetRaw.map((c) => [cellKey(c.cell), c.color]));
  const solved =
    placedColorMap.size === targetColorMap.size &&
    [...placedColorMap].every(([k, v]) => targetColorMap.get(k) === v);

  if (solved) {
    return {
      outcome: "solved",
      views: { front: true, right: true, top: true },
      bricksPlaced,
      bricksTotal,
      diagnoses: [],
    };
  }

  const placedViews = projectColors(placedAligned);
  const targetViews = projectColors(targetRaw);
  const views: Record<ViewName, boolean> = {
    front: mapsEqual(placedViews.front, targetViews.front),
    right: mapsEqual(placedViews.right, targetViews.right),
    top: mapsEqual(placedViews.top, targetViews.top),
  };
  const outcome = views.front && views.right && views.top ? "hidden-brick" : "views-mismatch";
  return { outcome, views, bricksPlaced, bricksTotal, diagnoses: diagnose(placed, target) };
}

function mapsEqual(a: Map<string, ColorId>, b: Map<string, ColorId>): boolean {
  if (a.size !== b.size) return false;
  for (const [k, v] of a) if (b.get(k) !== v) return false;
  return true;
}
