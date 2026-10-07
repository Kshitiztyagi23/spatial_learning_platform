import { useSession } from './state/session';
import type { Placement } from './core/types';

export interface LegoEventPayload {
  event_type: 'puzzle_start' | 'place' | 'remove' | 'clear_board' | 'check' | 'reject';
  puzzle_id: string;
  block_id?: string;
  block_type?: string;
  position_json?: string;
  rotation_json?: string;
  is_correct?: boolean;
  details_json?: string;
}

export interface LegoPuzzleResult {
  puzzle_id: string;
  solved: boolean;
  checks: number;
  placements: number;
}

function placementFields(p: Placement) {
  return {
    block_id: p.instanceId,
    block_type: p.typeId,
    position_json: JSON.stringify(p.origin),
    rotation_json: JSON.stringify(p.rotation),
  };
}

/**
 * Watches the LEGO session store and reports every build action through
 * `send`, while keeping a per-puzzle tally for the final submission. Kept
 * outside the store so the game core stays free of study concerns.
 */
export function startLegoTelemetry(send: (event: LegoEventPayload) => void) {
  const results = new Map<string, LegoPuzzleResult>();

  const tally = (puzzleId: string) => {
    let r = results.get(puzzleId);
    if (!r) {
      r = { puzzle_id: puzzleId, solved: false, checks: 0, placements: 0 };
      results.set(puzzleId, r);
    }
    return r;
  };

  const startPuzzle = (puzzleId: string) => {
    tally(puzzleId);
    send({ event_type: 'puzzle_start', puzzle_id: puzzleId });
  };

  startPuzzle(useSession.getState().derived.puzzle.id);

  const unsubscribe = useSession.subscribe((state, prev) => {
    const puzzleId = state.derived.puzzle.id;

    if (state.derived !== prev.derived) {
      startPuzzle(puzzleId);
      return;
    }

    if (state.placed !== prev.placed) {
      const before = new Set(prev.placed.map((p) => p.instanceId));
      const after = new Set(state.placed.map((p) => p.instanceId));
      const added = state.placed.filter((p) => !before.has(p.instanceId));
      const removed = prev.placed.filter((p) => !after.has(p.instanceId));

      for (const p of added) {
        tally(puzzleId).placements += 1;
        send({ event_type: 'place', puzzle_id: puzzleId, ...placementFields(p) });
      }
      if (state.placed.length === 0 && removed.length > 1) {
        send({ event_type: 'clear_board', puzzle_id: puzzleId, details_json: JSON.stringify({ removed: removed.length }) });
      } else {
        for (const p of removed) {
          send({ event_type: 'remove', puzzle_id: puzzleId, ...placementFields(p) });
        }
      }
    }

    if (state.lastCheck && state.lastCheck !== prev.lastCheck) {
      const { outcome, views, bricksPlaced, bricksTotal, diagnoses } = state.lastCheck;
      const solved = outcome === 'solved';
      const r = tally(puzzleId);
      r.checks += 1;
      r.solved = r.solved || solved;
      send({
        event_type: 'check',
        puzzle_id: puzzleId,
        is_correct: solved,
        details_json: JSON.stringify({ outcome, views, bricksPlaced, bricksTotal, diagnoses }),
      });
    }

    if (state.lastReject && state.lastReject !== prev.lastReject) {
      send({
        event_type: 'reject',
        puzzle_id: puzzleId,
        details_json: JSON.stringify({ reason: state.lastReject, selectedType: state.selectedType, rotation: state.rotation }),
      });
    }
  });

  return {
    results: () => [...results.values()],
    stop: unsubscribe,
  };
}
