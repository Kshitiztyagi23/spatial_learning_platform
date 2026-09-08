import { cellsFor } from "./geometry";
import { projectCells } from "./projection";
import type { CheckResult, DerivedPuzzle, Placement, ViewName, Vec3 } from "./types";

function minCorner(cells: Vec3[]): Vec3 {
  if (cells.length === 0) return { x: 0, y: 0, z: 0 };
  return {
    x: Math.min(...cells.map((c) => c.x)),
    y: Math.min(...cells.map((c) => c.y)),
    z: Math.min(...cells.map((c) => c.z)),
  };
}

function shiftedKey(cell: Vec3, offset: Vec3): string {
  return `${cell.x - offset.x},${cell.y - offset.y},${cell.z - offset.z}`;
}

function normalize(cells: Vec3[]): Set<string> {
  const offset = minCorner(cells);
  return new Set(cells.map((c) => shiftedKey(c, offset)));
}

/** instanceIds of placed bricks with at least one cell not in targetNorm */
function findWrongInstances(placed: Placement[], placedOffset: Vec3, targetNorm: Set<string>): string[] {
  const wrong: string[] = [];
  for (const p of placed) {
    const cells = cellsFor(p.typeId, p.rotation, p.origin);
    if (cells.some((c) => !targetNorm.has(shiftedKey(c, placedOffset)))) {
      wrong.push(p.instanceId);
    }
  }
  return wrong;
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
      wrongInstanceIds: [],
    };
  }

  const placedCells = placed.flatMap((p) => cellsFor(p.typeId, p.rotation, p.origin));
  const targetCells = target.puzzle.solution.flatMap((p) => cellsFor(p.typeId, p.rotation, p.origin));

  const placedOffset = minCorner(placedCells);
  const placedNorm = new Set(placedCells.map((c) => shiftedKey(c, placedOffset)));
  const targetNorm = normalize(targetCells);

  if (setsEqual(placedNorm, targetNorm)) {
    return {
      outcome: "solved",
      views: { front: true, right: true, top: true },
      bricksPlaced,
      bricksTotal,
      wrongInstanceIds: [],
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
  const wrongInstanceIds = findWrongInstances(placed, placedOffset, targetNorm);

  return { outcome, views, bricksPlaced, bricksTotal, wrongInstanceIds };
}
