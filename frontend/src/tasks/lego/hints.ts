import { useEffect, useState } from 'react';
import { useSession } from './state/session';
import { requestFeedback, acknowledgeFeedback } from '../../api/feedback';
import type { BoardSize, Diagnosis, ViewName } from './core/types';

const VIEW_COLUMNS: Record<ViewName, keyof BoardSize> = { front: 'width', right: 'depth', top: 'width' };

/** Which horizontal third of the view card a mismatch sits in, or nothing
 *  when it spans most of the card (then "look at the left" would mislead). */
function areaOf(d: Diagnosis, board: BoardSize): string | undefined {
  if (!d.view || !d.region) return undefined;
  const cols = board[VIEW_COLUMNS[d.view]];
  if (cols <= 1) return undefined;
  const { colFrom, colTo } = d.region;
  if (colTo - colFrom + 1 > (cols * 2) / 3) return undefined;
  const centre = (colFrom + colTo) / 2 / (cols - 1);
  return centre < 1 / 3 ? 'left' : centre > 2 / 3 ? 'right' : 'middle';
}

/**
 * Hint ladder for the experimental condition: each failed Check on a puzzle
 * asks the server for the next, more specific hint. When the participant
 * later solves the puzzle (or leaves it), the last hint is acknowledged so the
 * data shows whether hints led to corrections.
 */
export function useLegoHints(sessionId: string | null, enabled: boolean): string | null {
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId || !enabled) return;
    let failedChecks = 0;
    let pendingFeedbackId: string | null = null;

    const settle = (corrected: boolean) => {
      if (!pendingFeedbackId) return;
      acknowledgeFeedback(sessionId, pendingFeedbackId, corrected)
        .catch(err => console.warn('Hint outcome not recorded:', err));
      pendingFeedbackId = null;
    };

    const unsubscribe = useSession.subscribe((state, prev) => {
      if (state.derived !== prev.derived) {
        settle(false);
        failedChecks = 0;
        setHint(null);
        return;
      }
      if (!state.lastCheck || state.lastCheck === prev.lastCheck) return;

      const { outcome, diagnoses } = state.lastCheck;
      if (outcome === 'solved') {
        settle(true);
        setHint(null);
        return;
      }
      if (outcome === 'empty') return;

      failedChecks += 1;
      const board = state.derived.puzzle.board;
      requestFeedback(sessionId, {
        task_type: 'lego',
        attempt: failedChecks,
        diagnoses: diagnoses.map(d => ({ code: d.code, view: d.view, area: areaOf(d, board) })),
        context: { puzzle_id: state.derived.puzzle.id, attempt: failedChecks },
      })
        .then(res => {
          if (!res.shown || !res.message) return;
          // A newer hint replaces the old one, which counts as not yet corrected
          settle(false);
          pendingFeedbackId = res.feedback_id ?? null;
          setHint(res.message);
        })
        .catch(err => console.warn('Hint request failed:', err));
    });

    return () => {
      unsubscribe();
      settle(false);
    };
  }, [sessionId, enabled]);

  return hint;
}
