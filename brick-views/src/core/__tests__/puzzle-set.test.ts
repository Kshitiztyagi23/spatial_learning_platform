import { describe, expect, it } from "vitest";
import { derivePuzzle, loadPuzzles, validatePuzzle } from "../puzzle";

describe("the puzzle set", () => {
  it("has six puzzles, step-01 through step-06, in filename order", () => {
    const ids = loadPuzzles().map((p) => p.id);
    expect(ids).toEqual(["step-01", "step-02", "step-03", "step-04", "step-05", "step-06"]);
  });

  it("every puzzle's solution replays cleanly", () => {
    for (const puzzle of loadPuzzles()) {
      expect(() => validatePuzzle(puzzle)).not.toThrow();
    }
  });
});

describe("step-06: the enclosed brick", () => {
  it("removing the enclosed brick changes no projection but does change the cell set", () => {
    const puzzle = loadPuzzles().find((p) => p.id === "step-06");
    if (!puzzle) throw new Error("step-06 fixture is missing");

    const full = derivePuzzle(puzzle);
    const withoutHidden = { ...puzzle, solution: puzzle.solution.filter((p) => p.instanceId !== "q4") };
    const partial = derivePuzzle(withoutHidden);

    expect(partial.cells.size).toBe(full.cells.size - 4);
    expect(partial.viewGrids).toEqual(full.viewGrids);
  });
});
