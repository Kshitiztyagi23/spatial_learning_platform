import { cellKey, cellsFor, minCorner, setsEqual } from "./geometry";
import { PIECES } from "./pieces";
import { projectColors, toDisplayCell } from "./projection";
import type {
  ColorId,
  ColorMap,
  DerivedPuzzle,
  Diagnosis,
  DiagnosisRegion,
  Placement,
  Vec3,
  ViewName,
} from "./types";

const VIEWS: ViewName[] = ["front", "right", "top"];

function mapKeysEqual(a: ColorMap, b: ColorMap): boolean {
  return setsEqual(new Set(a.keys()), new Set(b.keys()));
}

function mapsEqual(a: ColorMap, b: ColorMap): boolean {
  if (a.size !== b.size) return false;
  for (const [k, v] of a) if (b.get(k) !== v) return false;
  return true;
}

/** Keys present in exactly one map — a silhouette difference. */
function keySymmetricDiff(a: ColorMap, b: ColorMap): string[] {
  const out: string[] = [];
  for (const k of a.keys()) if (!b.has(k)) out.push(k);
  for (const k of b.keys()) if (!a.has(k)) out.push(k);
  return out;
}

/** Keys present in both but coloured differently — a colour difference. */
function colourDiff(a: ColorMap, b: ColorMap): string[] {
  const out: string[] = [];
  for (const [k, v] of a) if (b.has(k) && b.get(k) !== v) out.push(k);
  return out;
}

function regionOf(view: ViewName, keys: string[], board: DerivedPuzzle["puzzle"]["board"]): DiagnosisRegion | undefined {
  if (keys.length === 0) return undefined;
  let rowFrom = Infinity, rowTo = -Infinity, colFrom = Infinity, colTo = -Infinity;
  for (const key of keys) {
    const { row, col } = toDisplayCell(view, key, board);
    rowFrom = Math.min(rowFrom, row);
    rowTo = Math.max(rowTo, row);
    colFrom = Math.min(colFrom, col);
    colTo = Math.max(colTo, col);
  }
  return { rowFrom, rowTo, colFrom, colTo };
}

function colourTally(items: { color: ColorId }[]): Map<ColorId, number> {
  const tally = new Map<ColorId, number>();
  for (const { color } of items) tally.set(color, (tally.get(color) ?? 0) + 1);
  return tally;
}

function tallyEqual(a: Map<ColorId, number>, b: Map<ColorId, number>): boolean {
  if (a.size !== b.size) return false;
  for (const [k, v] of a) if (b.get(k) !== v) return false;
  return true;
}

function withColor(cells: Vec3[], typeId: Placement["typeId"]): { cell: Vec3; color: ColorId }[] {
  return cells.map((cell) => ({ cell, color: PIECES[typeId].color }));
}

/**
 * Ranked coarsest-first: index 0 is the vaguest true thing that can be said
 * about the mismatch. Never names a brick — at most a view and a region.
 * Deterministic, no AI. Only called on a failed check (never solved/empty).
 */
export function diagnose(placed: Placement[], target: DerivedPuzzle): Diagnosis[] {
  const board = target.puzzle.board;
  const monochrome = !!target.puzzle.monochrome;

  const placedRaw = placed.flatMap((p) => withColor(cellsFor(p.typeId, p.rotation, p.origin), p.typeId));
  const targetRaw = target.puzzle.solution.flatMap((p) => withColor(cellsFor(p.typeId, p.rotation, p.origin), p.typeId));

  // Re-express the child's build in the target's own raw frame — translation
  // invariant, and it lines up with the view card, which always renders the
  // target at its own authored position.
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

  const placedViews = projectColors(placedAligned);
  const targetViews = projectColors(targetRaw);

  const silhouetteAllMatch = VIEWS.every((v) => mapKeysEqual(placedViews[v], targetViews[v]));

  if (silhouetteAllMatch) {
    const placedCellKeys = new Set(placedAligned.map((c) => cellKey(c.cell)));
    const targetCellKeys = new Set(targetRaw.map((c) => cellKey(c.cell)));

    if (!setsEqual(placedCellKeys, targetCellKeys)) {
      // Every view agrees, but the solid itself differs: a brick is hidden.
      // Colour is unobservable here by construction — nothing more to say.
      return [{ code: "hidden-brick" }];
    }

    if (monochrome) return []; // shape and cells match; nothing left to grade.

    const colourAllMatch = VIEWS.every((v) => mapsEqual(placedViews[v], targetViews[v]));
    if (colourAllMatch) return []; // solved in every observable way.

    const sameMultiset = tallyEqual(colourTally(placedAligned), colourTally(targetRaw));
    const diagnoses: Diagnosis[] = [{ code: sameMultiset ? "colour-swap" : "shape-right-colour-wrong" }];
    for (const v of VIEWS) {
      if (!mapsEqual(placedViews[v], targetViews[v])) {
        diagnoses.push({ code: "region-mismatch", view: v, region: regionOf(v, colourDiff(targetViews[v], placedViews[v]).concat(colourDiff(placedViews[v], targetViews[v])), board) });
      }
    }
    return diagnoses;
  }

  // The shape itself differs on at least one view.
  const diagnoses: Diagnosis[] = [];
  if (!mapKeysEqual(placedViews.top, targetViews.top)) {
    diagnoses.push({ code: "footprint-wrong" });
  } else {
    const placedMaxY = Math.max(0, ...placedAligned.map((c) => c.cell.y));
    const targetMaxY = Math.max(0, ...targetRaw.map((c) => c.cell.y));
    if (placedMaxY !== targetMaxY) diagnoses.push({ code: "height-wrong" });
  }

  for (const v of VIEWS) {
    if (!mapKeysEqual(placedViews[v], targetViews[v])) {
      diagnoses.push({ code: "region-mismatch", view: v, region: regionOf(v, keySymmetricDiff(placedViews[v], targetViews[v]), board) });
    }
  }
  return diagnoses;
}
