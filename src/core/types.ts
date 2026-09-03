export type Vec3 = { x: number; y: number; z: number };
export type Rotation = 0 | 90 | 180 | 270;
export type PieceTypeId = "2x2" | "2x3" | "2x4";

export interface PieceType {
  id: PieceTypeId;
  width: number;   // along x at rotation 0
  depth: number;   // along z at rotation 0
  color: string;   // hex
  label: string;   // "2 × 3"
}

export interface Placement {
  instanceId: string;
  typeId: PieceTypeId;
  rotation: Rotation;
  origin: Vec3;    // min-corner cell after rotation
}

export interface BoardSize { width: number; depth: number; height: number }

export interface Puzzle {
  id: string;
  name: string;
  hint: string;
  board: BoardSize;
  solution: Placement[];
}

/** "x,y,z" keys */
export type CellSet = Set<string>;
/** "a,b" keys, meaning depends on the view — see spec §2 */
export type ViewSet = Set<string>;

export interface Views { front: ViewSet; right: ViewSet; top: ViewSet }
export type ViewName = keyof Views;

export interface DerivedPuzzle {
  puzzle: Puzzle;
  cells: CellSet;
  views: Views;
  /** row-major booleans, already in display orientation */
  viewGrids: Record<ViewName, boolean[][]>;
  tray: Record<PieceTypeId, number>;
}

export type RejectReason =
  | "out-of-bounds"
  | "overlap"
  | "unsupported"
  | "none-left"
  | "load-bearing";   // removal only

export type PlaceResult = { ok: true } | { ok: false; reason: RejectReason };

export type CheckOutcome = "solved" | "hidden-brick" | "views-mismatch" | "empty";

export interface CheckResult {
  outcome: CheckOutcome;
  views: Record<ViewName, boolean>;
  bricksPlaced: number;
  bricksTotal: number;
}
