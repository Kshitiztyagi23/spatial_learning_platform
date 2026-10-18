import { useSession } from './state/session';
import type { Placement } from './core/types';

export interface LegoEventPayload {
  event_type: 'puzzle_start' | 'place' | 'remove' | 'clear_board' | 'reject';
  puzzle_id: string;
  block_id?: string;
  block_type?: string;
  position_json?: string;
  rotation_json?: string;
  is_correct?: boolean;
  details_json?: string;
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
 * `send`. Each Check also goes to `checkOnServer`, which records the
 * authoritative result (the server re-runs the check; scores come from
 * there). Kept outside the store so the game core stays free of study concerns.
 */
export function startLegoTelemetry(
  send: (event: LegoEventPayload) => void,
  checkOnServer: (puzzleId: string, placed: Placement[]) => void,
) {
  const startPuzzle = (puzzleId: string) => {
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
      checkOnServer(puzzleId, state.placed);
    }

    if (state.lastReject && state.lastReject !== prev.lastReject) {
      send({
        event_type: 'reject',
        puzzle_id: puzzleId,
        details_json: JSON.stringify({ reason: state.lastReject, selectedType: state.selectedType, rotation: state.rotation }),
      });
    }
  });

  return { stop: unsubscribe };
}
