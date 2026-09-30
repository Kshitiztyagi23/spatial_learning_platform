import { describe, expect, it } from "vitest";
import { check } from "../check";
import { derivePuzzle } from "../puzzle";
import type { Placement, Puzzle } from "../types";

const board = { width: 8, depth: 8, height: 4 };

function puzzleOf(solution: Placement[], monochrome?: boolean): Puzzle {
  return { id: "p", name: "p", hint: "", board, solution, monochrome };
}

describe("check", () => {
  it("returns empty before anything else when nothing is placed", () => {
    const target = derivePuzzle(puzzleOf([{ instanceId: "a", typeId: "2x2-red", rotation: 0, origin: { x: 0, y: 0, z: 0 } }]));
    const result = check([], target);
    expect(result.outcome).toBe("empty");
    expect(result.views).toEqual({ front: false, right: false, top: false });
  });

  it("is solved when the normalised cell sets and colours match exactly", () => {
    const target = derivePuzzle(puzzleOf([{ instanceId: "a", typeId: "2x2-red", rotation: 0, origin: { x: 0, y: 0, z: 0 } }]));
    const placed: Placement[] = [{ instanceId: "child-a", typeId: "2x2-red", rotation: 0, origin: { x: 0, y: 0, z: 0 } }];
    const result = check(placed, target);
    expect(result.outcome).toBe("solved");
    expect(result.diagnoses).toEqual([]);
  });

  it("is solved when the right shape is built in the wrong corner", () => {
    const target = derivePuzzle(puzzleOf([{ instanceId: "a", typeId: "2x2-red", rotation: 0, origin: { x: 0, y: 0, z: 0 } }]));
    // Same shape, shifted to a different corner of the board.
    const placed: Placement[] = [{ instanceId: "child-a", typeId: "2x2-red", rotation: 0, origin: { x: 3, y: 0, z: 5 } }];
    const result = check(placed, target);
    expect(result.outcome).toBe("solved");
  });

  it("is not solved when the shape is right but a visible colour is wrong", () => {
    const target = derivePuzzle(puzzleOf([{ instanceId: "a", typeId: "2x2-red", rotation: 0, origin: { x: 0, y: 0, z: 0 } }]));
    const placed: Placement[] = [{ instanceId: "child-a", typeId: "2x2-blue", rotation: 0, origin: { x: 0, y: 0, z: 0 } }];
    const result = check(placed, target);
    expect(result.outcome).not.toBe("solved");
  });

  it("reports views-mismatch and marks each view individually", () => {
    const target = derivePuzzle(puzzleOf([{ instanceId: "a", typeId: "2x4-yellow", rotation: 0, origin: { x: 0, y: 0, z: 0 } }]));
    // Child only built half the length, same colour: front matches (same
    // x,y footprint AND colour), right and top don't (missing the z=2,3 rows).
    const placed: Placement[] = [{ instanceId: "child-a", typeId: "2x2-yellow", rotation: 0, origin: { x: 0, y: 0, z: 0 } }];
    const result = check(placed, target);
    expect(result.outcome).toBe("views-mismatch");
    expect(result.views).toEqual({ front: true, right: false, top: false });
  });

  it("diagnoses a shape mismatch by view and region, never by naming a brick", () => {
    const a: Placement = { instanceId: "a", typeId: "2x2-red", rotation: 0, origin: { x: 0, y: 0, z: 0 } };
    const b: Placement = { instanceId: "b", typeId: "2x2-red", rotation: 0, origin: { x: 2, y: 0, z: 0 } };
    const target = derivePuzzle(puzzleOf([a, b]));

    // "a" placed correctly, "b" shifted one cell further out in x — the
    // z-span is unchanged, so the right view (z,y) should still match.
    const placedA: Placement = { instanceId: "child-a", typeId: "2x2-red", rotation: 0, origin: { x: 0, y: 0, z: 0 } };
    const placedBShifted: Placement = { instanceId: "child-b", typeId: "2x2-red", rotation: 0, origin: { x: 3, y: 0, z: 0 } };

    const result = check([placedA, placedBShifted], target);
    expect(result.outcome).toBe("views-mismatch");
    // Diagnosis objects never carry an instanceId or any brick identity — only a
    // code, optionally a view name and a region. That's a type-level guarantee,
    // not just a runtime one.
    expect(result.diagnoses[0]?.code).toBe("footprint-wrong");
    expect(result.diagnoses.some((d) => d.code === "region-mismatch" && d.view === "top")).toBe(true);
    expect(result.diagnoses.some((d) => d.code === "region-mismatch" && d.view === "front")).toBe(true);
    expect(result.diagnoses.some((d) => d.view === "right")).toBe(false);
  });

  it("reports hidden-brick when all views match but a brick is fully enclosed", () => {
    // Three bricks (F, R, T) each duplicate one of H's three projections,
    // so H can be removed without changing any view.
    const H: Placement = { instanceId: "H", typeId: "2x2-red", rotation: 0, origin: { x: 2, y: 0, z: 2 } };
    const F: Placement = { instanceId: "F", typeId: "2x2-red", rotation: 0, origin: { x: 2, y: 0, z: 0 } };
    const R: Placement = { instanceId: "R", typeId: "2x2-red", rotation: 0, origin: { x: 0, y: 0, z: 2 } };
    const T: Placement = { instanceId: "T", typeId: "2x2-red", rotation: 0, origin: { x: 2, y: 1, z: 2 } };

    const target = derivePuzzle(puzzleOf([H, F, R, T]));
    const placed: Placement[] = [F, R, T]; // H omitted — the hidden brick.

    const result = check(placed, target);
    expect(result.outcome).toBe("hidden-brick");
    expect(result.views).toEqual({ front: true, right: true, top: true });
    expect(result.bricksPlaced).toBe(3);
    expect(result.bricksTotal).toBe(4);
    expect(result.diagnoses).toEqual([{ code: "hidden-brick" }]);
  });

  it("a monochrome puzzle grades shape only — a colour swap on a sealed brick still solves", () => {
    // Same H/F/R/T enclosure as above, but H is authored blue while
    // everything else is red. Colour is not graded in a monochrome puzzle,
    // so building it with H swapped to red still solves.
    const H: Placement = { instanceId: "H", typeId: "2x2-blue", rotation: 0, origin: { x: 2, y: 0, z: 2 } };
    const F: Placement = { instanceId: "F", typeId: "2x2-red", rotation: 0, origin: { x: 2, y: 0, z: 0 } };
    const R: Placement = { instanceId: "R", typeId: "2x2-red", rotation: 0, origin: { x: 0, y: 0, z: 2 } };
    const T: Placement = { instanceId: "T", typeId: "2x2-red", rotation: 0, origin: { x: 2, y: 1, z: 2 } };

    const target = derivePuzzle(puzzleOf([H, F, R, T], true));
    const placedHRedInstead: Placement = { ...H, typeId: "2x2-red", instanceId: "child-h" };
    const result = check([placedHRedInstead, F, R, T], target);

    expect(result.outcome).toBe("solved");
  });
});
