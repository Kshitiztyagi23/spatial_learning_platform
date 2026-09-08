import { expect, it } from "vitest";
import { projectCells, projectColors, toGrids } from "../projection";
import type { BoardSize, Vec3 } from "../types";

// An L that is asymmetric on every axis, so a flipped row or column
// can't accidentally still look right. Drawn out:
//
//   y=1  z=0: (0,1,0)
//   y=0  z=0: (0,0,0) (1,0,0) (2,0,0)
//   y=0  z=1: (0,0,1)
//
// board is exactly {width: 3, depth: 2, height: 2}, sized to the shape.
const cells: Vec3[] = [
  { x: 0, y: 0, z: 0 },
  { x: 1, y: 0, z: 0 },
  { x: 2, y: 0, z: 0 },
  { x: 0, y: 0, z: 1 },
  { x: 0, y: 1, z: 0 },
];
const board: BoardSize = { width: 3, depth: 2, height: 2 };

it("projects and gridifies an asymmetric L into the exact display-orientation drawing", () => {
  const views = projectCells(cells);
  const grids = toGrids(views, board);

  // front: looking along -z. row 0 = highest y, col 0 = lowest x.
  expect(grids.front).toEqual([
    [true, false, false],
    [true, true, true],
  ]);

  // right: looking along -x. row 0 = highest y, col 0 = highest z.
  expect(grids.right).toEqual([
    [false, true],
    [true, true],
  ]);

  // top: looking along -y. row 0 = lowest z (front edge at top), col 0 = lowest x.
  expect(grids.top).toEqual([
    [true, true, true],
    [true, false, false],
  ]);
});

it("projectCells' keys equal projectColors' keys (one shared depth-sort)", () => {
  const withColor = cells.map((cell) => ({ cell, color: "red" as const }));
  const silhouette = projectCells(cells);
  const colored = projectColors(withColor);
  expect(new Set(colored.front.keys())).toEqual(silhouette.front);
  expect(new Set(colored.right.keys())).toEqual(silhouette.right);
  expect(new Set(colored.top.keys())).toEqual(silhouette.top);
});

it("depth-sorts each view: the nearest cell's colour wins, not the first-inserted one", () => {
  // Two cells stacked along z at the same (x,y) — front view sees only the
  // nearer one (larger z, spec §2). Insert the far one first, deliberately,
  // so a "first wins" bug would fail this.
  const stacked = [
    { cell: { x: 0, y: 0, z: 0 }, color: "blue" as const }, // far from front
    { cell: { x: 0, y: 0, z: 1 }, color: "red" as const }, // nearer to front
  ];
  const views = projectColors(stacked);
  expect(views.front.get("0,0")).toBe("red");
});
