import { PIECES } from "./pieces";
import type { Placement, PieceTypeId, Rotation, Vec3 } from "./types";

export function footprintFor(typeId: PieceTypeId, rotation: Rotation): { w: number; d: number } {
  const piece = PIECES[typeId];
  return rotation === 90 || rotation === 270
    ? { w: piece.depth, d: piece.width }
    : { w: piece.width, d: piece.depth };
}

/**
 * Min-corner origin for a piece pivoting around a fixed board point (the hovered
 * cell). Each 90° step sweeps the footprint into the next quadrant around that
 * point (clockwise) instead of rotating in place around the piece's own center —
 * a plain rectangle is point-symmetric about its center, so center-pivoting makes
 * 0/180 and 90/270 indistinguishable, which is the behavior this replaces.
 */
export function originForPivot(typeId: PieceTypeId, rotation: Rotation, pivot: Vec3): Vec3 {
  const { w, d } = footprintFor(typeId, rotation);
  switch (rotation) {
    case 0:
      return { x: pivot.x, y: pivot.y, z: pivot.z };
    case 90:
      return { x: pivot.x, y: pivot.y, z: pivot.z - d };
    case 180:
      return { x: pivot.x - w, y: pivot.y, z: pivot.z - d };
    case 270:
      return { x: pivot.x - w, y: pivot.y, z: pivot.z };
  }
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
