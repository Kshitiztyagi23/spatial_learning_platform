import type { BoardSize, Vec3, ViewName, Views } from "./types";

export function projectCells(cells: Vec3[]): Views {
  const front: Views["front"] = new Set();
  const right: Views["right"] = new Set();
  const top: Views["top"] = new Set();

  for (const cell of cells) {
    front.add(`${cell.x},${cell.y}`);
    right.add(`${cell.z},${cell.y}`);
    top.add(`${cell.x},${cell.z}`);
  }

  return { front, right, top };
}

function buildGrid(rows: number, cols: number, isFilled: (row: number, col: number) => boolean): boolean[][] {
  const grid: boolean[][] = [];
  for (let row = 0; row < rows; row++) {
    const line: boolean[] = [];
    for (let col = 0; col < cols; col++) line.push(isFilled(row, col));
    grid.push(line);
  }
  return grid;
}

export function toGrids(views: Views, board: BoardSize): Record<ViewName, boolean[][]> {
  const front = buildGrid(board.height, board.width, (row, col) => {
    const y = board.height - 1 - row;
    const x = col;
    return views.front.has(`${x},${y}`);
  });

  const right = buildGrid(board.height, board.depth, (row, col) => {
    const y = board.height - 1 - row;
    const z = board.depth - 1 - col;
    return views.right.has(`${z},${y}`);
  });

  const top = buildGrid(board.depth, board.width, (row, col) => {
    const z = row;
    const x = col;
    return views.top.has(`${x},${z}`);
  });

  return { front, right, top };
}
