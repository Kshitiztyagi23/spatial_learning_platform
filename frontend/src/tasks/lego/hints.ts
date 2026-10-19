import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from './state/session';
import { requestFeedback, acknowledgeFeedback, type HintStatus } from '../../api/feedback';

export interface LegoHints {
  hint: string | null;
  /** Button state for the current puzzle (null until the first server check) */
  status: HintStatus | null;
  loading: boolean;
  /** Feed each POST /lego/check response in, to update the button */
  onCheckResult: (puzzleId: string, status: HintStatus) => void;
  requestHint: () => void;
}

/**
 * "Need a hint?" for LEGO. The server counts failed checks of the puzzle and
 * unlocks the button after the admin-set number; each press asks for one
 * hint, more specific each time, up to the limit. When the student then
 * solves the puzzle (or leaves it) the last hint is acknowledged, so the data
 * shows whether hints led to corrections.
 */
export function useLegoHints(sessionId: string | null, enabled: boolean): LegoHints {
  const [hint, setHint] = useState<string | null>(null);
  const [status, setStatus] = useState<HintStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const pendingFeedbackId = useRef<string | null>(null);
  const puzzleRef = useRef(useSession.getState().derived.puzzle.id);

  const settle = useCallback((corrected: boolean) => {
    if (!sessionId || !pendingFeedbackId.current) return;
    acknowledgeFeedback(sessionId, pendingFeedbackId.current, corrected)
      .catch(err => console.warn('Hint outcome not recorded:', err));
    pendingFeedbackId.current = null;
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || !enabled) return;
    const unsubscribe = useSession.subscribe((state, prev) => {
      if (state.derived !== prev.derived) {
        settle(false);
        puzzleRef.current = state.derived.puzzle.id;
        setHint(null);
        setStatus(null);
      } else if (state.lastCheck?.outcome === 'solved' && state.lastCheck !== prev.lastCheck) {
        settle(true);
        setHint(null);
      }
    });
    return () => {
      unsubscribe();
      settle(false);
    };
  }, [sessionId, enabled, settle]);

  const onCheckResult = useCallback((puzzleId: string, next: HintStatus) => {
    if (puzzleId === puzzleRef.current) setStatus(next);
  }, []);

  const requestHint = useCallback(() => {
    if (!sessionId || loading) return;
    const puzzleId = puzzleRef.current;
    setLoading(true);
    requestFeedback(sessionId, { task_type: 'lego', item_id: puzzleId, context: { puzzle_id: puzzleId } })
      .then(res => {
        if (puzzleId !== puzzleRef.current) return;
        setStatus(res);
        if (res.shown && res.message) {
          settle(false); // a newer hint replaces the old one: not yet corrected
          pendingFeedbackId.current = res.feedback_id ?? null;
          setHint(res.message);
        } else if (res.reason === 'nothing_to_fix') {
          setHint('Press Check first, then ask again.');
        }
      })
      .catch(err => console.warn('Hint request failed:', err))
      .finally(() => setLoading(false));
  }, [sessionId, loading, settle]);

  return { hint, status: enabled ? status : null, loading, onCheckResult, requestHint };
}
