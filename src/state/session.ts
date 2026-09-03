import { create } from "zustand";
import { brickAtCell } from "../core/geometry";
import { canPlace, canRemove } from "../core/placement";
import { derivePuzzle, loadPuzzles } from "../core/puzzle";
import { check } from "../core/check";
import type {
  CheckResult,
  DerivedPuzzle,
  PieceTypeId,
  Placement,
  RejectReason,
  Rotation,
  Vec3,
} from "../core/types";

interface Session {
  derived: DerivedPuzzle;
  placed: Placement[];
  remaining: Record<PieceTypeId, number>;
  selectedType: PieceTypeId | null;
  rotation: Rotation;
  mode: "build" | "erase";
  lastCheck: CheckResult | null;
  lastReject: RejectReason | null;

  loadPuzzle(id: string): void;
  selectType(id: PieceTypeId | null): void;
  rotateCW(): void;
  place(origin: Vec3): void;
  removeAt(cell: Vec3): void;
  clearBoard(): void;
  runCheck(): void;
  dismissFeedback(): void;
}

function findPuzzle(id: string) {
  const puzzle = loadPuzzles().find((p) => p.id === id);
  if (!puzzle) throw new Error(`No puzzle with id "${id}".`);
  return puzzle;
}

const firstPuzzle = loadPuzzles()[0];
if (!firstPuzzle) throw new Error("No puzzles found under src/data/puzzles.");
const initialDerived = derivePuzzle(firstPuzzle);

export const useSession = create<Session>((set, get) => ({
  derived: initialDerived,
  placed: [],
  remaining: { ...initialDerived.tray },
  selectedType: null,
  rotation: 0,
  mode: "build",
  lastCheck: null,
  lastReject: null,

  loadPuzzle(id) {
    const derived = derivePuzzle(findPuzzle(id));
    set({
      derived,
      placed: [],
      remaining: { ...derived.tray },
      selectedType: null,
      rotation: 0,
      mode: "build",
      lastCheck: null,
      lastReject: null,
    });
  },

  selectType(id) {
    set({ selectedType: id });
  },

  rotateCW() {
    set((state) => ({ rotation: ((state.rotation + 90) % 360) as Rotation }));
  },

  place(origin) {
    const { selectedType, rotation, placed, derived, remaining } = get();
    if (!selectedType) return;

    const result = canPlace(placed, derived.puzzle.board, remaining, selectedType, rotation, origin);
    if (!result.ok) {
      set({ lastReject: result.reason });
      return;
    }

    const placement: Placement = {
      instanceId: crypto.randomUUID(),
      typeId: selectedType,
      rotation,
      origin,
    };

    set({
      placed: [...placed, placement],
      remaining: { ...remaining, [selectedType]: remaining[selectedType] - 1 },
      lastCheck: null,
      lastReject: null,
    });
  },

  removeAt(cell) {
    const { placed, remaining } = get();
    const brick = brickAtCell(placed, cell);
    if (!brick) return;

    const result = canRemove(placed, brick.instanceId);
    if (!result.ok) {
      set({ lastReject: result.reason });
      return;
    }

    set({
      placed: placed.filter((p) => p.instanceId !== brick.instanceId),
      remaining: { ...remaining, [brick.typeId]: remaining[brick.typeId] + 1 },
      lastCheck: null,
      lastReject: null,
    });
  },

  clearBoard() {
    const { derived } = get();
    set({ placed: [], remaining: { ...derived.tray }, lastCheck: null, lastReject: null });
  },

  runCheck() {
    const { placed, derived } = get();
    set({ lastCheck: check(placed, derived) });
  },

  dismissFeedback() {
    set({ lastCheck: null, lastReject: null });
  },
}));
