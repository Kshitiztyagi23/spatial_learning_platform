import { PIECES } from "./pieces";
import type { Placement, PieceTypeId, Rotation, Vec3 } from "./types";

export function footprintFor(typeId: PieceTypeId, rotation: Rotation): { w: number; d: number } {
  const piece = PIECES[typeId];
  return rotation === 90 || rotation === 270
    ? { w: piece.depth, d: piece.width }
    : { w: piece.width, d: piece.depth };
}

export function cellsFor(typeId: PieceTypeId, rotation: Rotation, origin: Vec3): Vec3[] {
  const { w, d } = footprintFor(typeId, rotation);
  const cells: Vec3[] = [];
  for (let dx = 0; dx < w; dx++) {
    for (let dz = 0; dz < d; dz++) {
      cells.push({ x: origin.x + dx, y: origin.y, z: origin.z + dz });
    }
  }
  return cells;
}

export function brickAtCell(placed: Placement[], cell: Vec3): Placement | null {
  for (const placement of placed) {
    const cells = cellsFor(placement.typeId, placement.rotation, placement.origin);
    for (const c of cells) {
      if (c.x === cell.x && c.y === cell.y && c.z === cell.z) return placement;
    }
  }
  return null;
}
