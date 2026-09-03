import { describe, expect, it } from "vitest";
import { useSession } from "../../state/session";
import { loadPuzzles } from "../puzzle";
import type { PieceTypeId } from "../types";

const ALL_TYPES: PieceTypeId[] = ["2x2", "2x3", "2x4"];

describe("solve-all: every product puzzle solves through store actions alone", () => {
  for (const puzzle of loadPuzzles()) {
    it(`solves ${puzzle.id} (${puzzle.name})`, () => {
      useSession.getState().loadPuzzle(puzzle.id);

      for (const placement of puzzle.solution) {
        useSession.getState().selectType(placement.typeId);

        while (useSession.getState().rotation !== placement.rotation) {
          useSession.getState().rotateCW();
        }

        useSession.getState().place(placement.origin);

        const { lastReject } = useSession.getState();
        expect(
          lastReject,
          `puzzle "${puzzle.id}": placement "${placement.instanceId}" was rejected (${lastReject})`,
        ).toBeNull();
      }

      useSession.getState().runCheck();
      const state = useSession.getState();

      expect(state.lastCheck?.outcome, `puzzle "${puzzle.id}" did not solve`).toBe("solved");

      for (const typeId of ALL_TYPES) {
        expect(
          state.remaining[typeId],
          `puzzle "${puzzle.id}": ${typeId} tray did not empty`,
        ).toBe(0);
      }
    });
  }
});
