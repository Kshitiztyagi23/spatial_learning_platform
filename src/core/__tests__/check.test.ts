import { describe, expect, it } from "vitest";
import { check } from "../check";
import { derivePuzzle } from "../puzzle";
import type { Placement, Puzzle } from "../types";

const board = { width: 8, depth: 8, height: 4 };

function puzzleOf(solution: Placement[]): Puzzle {
  return { id: "p", name: "p", hint: "", board, solution };
}

describe("check", () => {
  it("returns empty before anything else when nothing is placed", () => {
    const target = derivePuzzle(puzzleOf([{ instanceId: "a", typeId: "2x2", rotation: 0, origin: { x: 0, y: 0, z: 0 } }]));
    const result = check([], target);
    expect(result.outcome).toBe("empty");
    expect(result.views).toEqual({ front: false, right: false, top: false });
  });

  it("is solved when the normalised cell sets match exactly", () => {
    const target = derivePuzzle(puzzleOf([{ instanceId: "a", typeId: "2x2", rotation: 0, origin: { x: 0, y: 0, z: 0 } }]));
    const placed: Placement[] = [{ instanceId: "child-a", typeId: "2x2", rotation: 0, origin: { x: 0, y: 0, z: 0 } }];
    const result = check(placed, target);
    expect(result.outcome).toBe("solved");
  });

  it("is solved when the right shape is built in the wrong corner", () => {
    const target = derivePuzzle(puzzleOf([{ instanceId: "a", typeId: "2x2", rotation: 0, origin: { x: 0, y: 0, z: 0 } }]));
    // Same shape, shifted to a different corner of the board.
    const placed: Placement[] = [{ instanceId: "child-a", typeId: "2x2", rotation: 0, origin: { x: 3, y: 0, z: 5 } }];
    const result = check(placed, target);
    expect(result.outcome).toBe("solved");
  });

  it("reports views-mismatch and marks each view individually", () => {
    const target = derivePuzzle(puzzleOf([{ instanceId: "a", typeId: "2x4", rotation: 0, origin: { x: 0, y: 0, z: 0 } }]));
    // Child only built half the length: front matches (same x,y footprint),
    // right and top don't (missing the z=2,3 rows).
    const placed: Placement[] = [{ instanceId: "child-a", typeId: "2x2", rotation: 0, origin: { x: 0, y: 0, z: 0 } }];
    const result = check(placed, target);
    expect(result.outcome).toBe("views-mismatch");
    expect(result.views).toEqual({ front: true, right: false, top: false });
  });

  it("flags the misplaced brick's instanceId and leaves correct bricks off the list", () => {
    const a: Placement = { instanceId: "a", typeId: "2x2", rotation: 0, origin: { x: 0, y: 0, z: 0 } };
    const b: Placement = { instanceId: "b", typeId: "2x2", rotation: 0, origin: { x: 2, y: 0, z: 0 } };
    const target = derivePuzzle(puzzleOf([a, b]));

    // "a" placed correctly, "b" placed one cell off from where the solution wants it
    const placedA: Placement = { instanceId: "child-a", typeId: "2x2", rotation: 0, origin: { x: 0, y: 0, z: 0 } };
    const placedBWrong: Placement = { instanceId: "child-b", typeId: "2x2", rotation: 0, origin: { x: 3, y: 0, z: 0 } };

    const result = check([placedA, placedBWrong], target);
    expect(result.outcome).toBe("views-mismatch");
    expect(result.wrongInstanceIds).toEqual(["child-b"]);
  });

  it("leaves wrongInstanceIds empty when solved", () => {
    const target = derivePuzzle(puzzleOf([{ instanceId: "a", typeId: "2x2", rotation: 0, origin: { x: 0, y: 0, z: 0 } }]));
    const placed: Placement[] = [{ instanceId: "child-a", typeId: "2x2", rotation: 0, origin: { x: 0, y: 0, z: 0 } }];
    expect(check(placed, target).wrongInstanceIds).toEqual([]);
  });

  it("reports hidden-brick when all views match but a brick is fully enclosed", () => {
    // Three bricks (F, R, T) each duplicate one of H's three projections,
    // so H can be removed without changing any view.
    const H: Placement = { instanceId: "H", typeId: "2x2", rotation: 0, origin: { x: 2, y: 0, z: 2 } };
    const F: Placement = { instanceId: "F", typeId: "2x2", rotation: 0, origin: { x: 2, y: 0, z: 0 } };
    const R: Placement = { instanceId: "R", typeId: "2x2", rotation: 0, origin: { x: 0, y: 0, z: 2 } };
    const T: Placement = { instanceId: "T", typeId: "2x2", rotation: 0, origin: { x: 2, y: 1, z: 2 } };

    const target = derivePuzzle(puzzleOf([H, F, R, T]));
    const placed: Placement[] = [F, R, T]; // H omitted — the hidden brick.

    const result = check(placed, target);
    expect(result.outcome).toBe("hidden-brick");
    expect(result.views).toEqual({ front: true, right: true, top: true });
    expect(result.bricksPlaced).toBe(3);
    expect(result.bricksTotal).toBe(4);
  });
});
