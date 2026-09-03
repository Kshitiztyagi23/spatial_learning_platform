import { describe, expect, it } from "vitest";
import { brickAtCell, cellsFor, footprintFor } from "../geometry";
import type { Placement } from "../types";

describe("footprintFor", () => {
  it("keeps width/depth at rotation 0", () => {
    expect(footprintFor("2x3", 0)).toEqual({ w: 2, d: 3 });
  });

  it("keeps width/depth at rotation 180", () => {
    expect(footprintFor("2x3", 180)).toEqual({ w: 2, d: 3 });
  });

  it("swaps width/depth at rotation 90", () => {
    expect(footprintFor("2x3", 90)).toEqual({ w: 3, d: 2 });
  });

  it("swaps width/depth at rotation 270", () => {
    expect(footprintFor("2x3", 270)).toEqual({ w: 3, d: 2 });
  });
});

describe("cellsFor", () => {
  it("2x3 at rotation 90 occupies 3 along x and 2 along z", () => {
    const cells = cellsFor("2x3", 90, { x: 1, y: 0, z: 1 });
    const xs = new Set(cells.map((c) => c.x));
    const zs = new Set(cells.map((c) => c.z));
    expect(cells).toHaveLength(6);
    expect(xs).toEqual(new Set([1, 2, 3]));
    expect(zs).toEqual(new Set([1, 2]));
  });

  it("places every cell at the origin's y", () => {
    const cells = cellsFor("2x2", 0, { x: 0, y: 2, z: 0 });
    expect(cells.every((c) => c.y === 2)).toBe(true);
  });
});

describe("brickAtCell", () => {
  const placed: Placement[] = [
    { instanceId: "a", typeId: "2x2", rotation: 0, origin: { x: 0, y: 0, z: 0 } },
  ];

  it("finds the placement occupying a cell", () => {
    expect(brickAtCell(placed, { x: 1, y: 0, z: 1 })?.instanceId).toBe("a");
  });

  it("returns null for an empty cell", () => {
    expect(brickAtCell(placed, { x: 5, y: 0, z: 5 })).toBeNull();
  });
});
