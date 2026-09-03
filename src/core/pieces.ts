import type { PieceType, PieceTypeId } from "./types";

export const PIECES: Record<PieceTypeId, PieceType> = Object.freeze({
  "2x2": Object.freeze({ id: "2x2", width: 2, depth: 2, color: "#E3000B", label: "2 × 2" }),
  "2x3": Object.freeze({ id: "2x3", width: 2, depth: 3, color: "#1F7AE0", label: "2 × 3" }),
  "2x4": Object.freeze({ id: "2x4", width: 2, depth: 4, color: "#F4B71E", label: "2 × 4" }),
});
