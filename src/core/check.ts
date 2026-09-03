import { cellsFor } from "./geometry";
import { projectCells } from "./projection";
import type { CheckResult, DerivedPuzzle, Placement, ViewName, Vec3 } from "./types";

function normalize(cells: Vec3[]): Set<string> {
  if (cells.length === 0) return new Set();
  const minX = Math.min(...cells.map((c) => c.x));
  const minY = Math.min(...cells.map((c) => c.y));
  const minZ = Math.min(...cells.map((c) => c.z));
  return new Set(cells.map((c) => `${c.x - minX},${c.y - minY},${c.z - minZ}`));
}

function parseCell(key: string): Vec3 {
  const [x, y, z] = key.split(",").map(Number);
  return { x: x ?? 0, y: y ?? 0, z: z ?? 0 };
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
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
    };
  }

  const placedCells = placed.flatMap((p) => cellsFor(p.typeId, p.rotation, p.origin));
  const targetCells = target.puzzle.solution.flatMap((p) => cellsFor(p.typeId, p.rotation, p.origin));

  const placedNorm = normalize(placedCells);
  const targetNorm = normalize(targetCells);

  if (setsEqual(placedNorm, targetNorm)) {
    return {
      outcome: "solved",
      views: { front: true, right: true, top: true },
      bricksPlaced,
      bricksTotal,
    };
  }

  const placedViews = projectCells([...placedNorm].map(parseCell));
  const targetViews = projectCells([...targetNorm].map(parseCell));

  const views: Record<ViewName, boolean> = {
    front: setsEqual(placedViews.front, targetViews.front),
    right: setsEqual(placedViews.right, targetViews.right),
    top: setsEqual(placedViews.top, targetViews.top),
  };

  const outcome = views.front && views.right && views.top ? "hidden-brick" : "views-mismatch";

  return { outcome, views, bricksPlaced, bricksTotal };
}
