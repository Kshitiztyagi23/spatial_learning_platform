import type { BoardSize, ColorId, ColorMap, ColorViews, Vec3, ViewName, Views } from "./types";

/** "a,b" key per view: front=(x,y), right=(z,y), top=(x,z). Spec §2. */
export function viewKey(view: ViewName, cell: Vec3): string {
  switch (view) {
    case "front":
      return `${cell.x},${cell.y}`;
    case "right":
      return `${cell.z},${cell.y}`;
    case "top":
      return `${cell.x},${cell.z}`;
  }
}

/** The coordinate each view's camera moves along — the nearer cell wins the
 *  projection. front looks along -z (largest z nearest), right along -x
 *  (largest x), top along -y (largest y). Spec §2. */
function depthOf(view: ViewName, cell: Vec3): number {
  switch (view) {
    case "front":
      return cell.z;
    case "right":
      return cell.x;
    case "top":
      return cell.y;
  }
}

/** Depth-sorted per view: at each "a,b", the colour of the nearest brick.
 *  Single source of truth for "nearest wins" — projectCells wraps this. */
export function projectColors(cells: { cell: Vec3; color: ColorId }[]): ColorViews {
  const views: Record<ViewName, ColorMap> = { front: new Map(), right: new Map(), top: new Map() };
  const nearest: Record<ViewName, Map<string, number>> = { front: new Map(), right: new Map(), top: new Map() };

  for (const { cell, color } of cells) {
    for (const view of ["front", "right", "top"] as ViewName[]) {
      const key = viewKey(view, cell);
      const depth = depthOf(view, cell);
      const bestSoFar = nearest[view].get(key);
      if (bestSoFar === undefined || depth > bestSoFar) {
        nearest[view].set(key, depth);
        views[view].set(key, color);
      }
    }
  }

  return views;
}

/** Silhouette only — a two-line wrapper over projectColors's keys, so the
 *  "nearest wins" depth-sort has exactly one implementation. */
export function projectCells(cells: Vec3[]): Views {
  const colorViews = projectColors(cells.map((cell) => ({ cell, color: "red" as ColorId })));
  return {
    front: new Set(colorViews.front.keys()),
    right: new Set(colorViews.right.keys()),
    top: new Set(colorViews.top.keys()),
  };
}

/** The single place the display-orientation convention (spec §2) lives —
 *  including the right-view z-flip the spec warns will otherwise cost a day.
 *  Both `toGrids` (rendering diagnostic grids) and `diagnose()` (region
 *  bounding boxes) go through this so the orientation can't drift apart. */
export function toDisplayCell(view: ViewName, key: string, board: BoardSize): { row: number; col: number } {
  const [a, b] = key.split(",").map(Number) as [number, number];
  switch (view) {
    case "front": {
      const x = a, y = b;
      return { row: board.height - 1 - y, col: x };
    }
    case "right": {
      const z = a, y = b;
      return { row: board.height - 1 - y, col: board.depth - 1 - z };
    }
    case "top": {
      const x = a, z = b;
      return { row: z, col: x };
    }
  }
}

function gridSize(view: ViewName, board: BoardSize): { rows: number; cols: number } {
  switch (view) {
    case "front":
      return { rows: board.height, cols: board.width };
    case "right":
      return { rows: board.height, cols: board.depth };
    case "top":
      return { rows: board.depth, cols: board.width };
  }
}

export function toGrids(views: Views, board: BoardSize): Record<ViewName, boolean[][]> {
  const result = {} as Record<ViewName, boolean[][]>;
  for (const view of ["front", "right", "top"] as ViewName[]) {
    const { rows, cols } = gridSize(view, board);
    const grid: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
    for (const key of views[view]) {
      const { row, col } = toDisplayCell(view, key, board);
      grid[row]![col] = true;
    }
    result[view] = grid;
  }
  return result;
}
