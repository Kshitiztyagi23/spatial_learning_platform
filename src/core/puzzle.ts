import { cellsFor } from "./geometry";
import { canPlace } from "./placement";
import { projectCells, toGrids } from "./projection";
import type { CellSet, DerivedPuzzle, PieceTypeId, Placement, Puzzle } from "./types";

function emptyTray(): Record<PieceTypeId, number> {
  return { "2x2": 0, "2x3": 0, "2x4": 0 };
}

function tallyTray(solution: Placement[]): Record<PieceTypeId, number> {
  const tray = emptyTray();
  for (const placement of solution) tray[placement.typeId] += 1;
  return tray;
}

export function derivePuzzle(puzzle: Puzzle): DerivedPuzzle {
  const allCells = puzzle.solution.flatMap((placement) =>
    cellsFor(placement.typeId, placement.rotation, placement.origin),
  );

  const cells: CellSet = new Set(allCells.map((c) => `${c.x},${c.y},${c.z}`));
  const views = projectCells(allCells);
  const viewGrids = toGrids(views, puzzle.board);
  const tray = tallyTray(puzzle.solution);

  return { puzzle, cells, views, viewGrids, tray };
}

export function validatePuzzle(puzzle: Puzzle): void {
  const tray = tallyTray(puzzle.solution);
  const placed: Placement[] = [];

  for (const placement of puzzle.solution) {
    const result = canPlace(placed, puzzle.board, tray, placement.typeId, placement.rotation, placement.origin);
    if (!result.ok) {
      throw new Error(
        `Puzzle "${puzzle.id}": placement "${placement.instanceId}" is invalid (${result.reason}).`,
      );
    }
    placed.push(placement);
    tray[placement.typeId] -= 1;
  }
}

export function loadPuzzles(): Puzzle[] {
  const puzzleModules = import.meta.glob<Puzzle>("../data/puzzles/*.json", {
    eager: true,
    import: "default",
  });
  return Object.keys(puzzleModules)
    .sort()
    .map((path) => puzzleModules[path]!);
}
