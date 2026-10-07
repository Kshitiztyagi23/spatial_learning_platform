import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSessionContext, useSessionDispatch } from './SessionContext';
import { getSession } from '../api/sessions';
import { STAGE_ROUTES, type Stage } from './stages';

/**
 * On first load with a saved session (i.e. after a refresh), asks the server
 * where the participant actually is and routes there, so a refresh neither
 * restarts the study nor lets a URL skip ahead. Finished or unknown sessions
 * are cleared so the next participant starts fresh.
 */
export function ResumeGate({ children }: { children: React.ReactNode }) {
  const { sessionId } = useSessionContext();
  const setSession = useSessionDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(!!sessionId);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    getSession(sessionId)
      .then((session) => {
        if (cancelled) return;
        if (session.status === 'completed' || session.current_stage === 'done') {
          setSession({ sessionId: null, participantId: null, condition: null, currentStage: null });
          if (location.pathname !== '/done') navigate('/', { replace: true });
          return;
        }
        setSession({
          currentStage: session.current_stage,
          condition: session.condition,
          participantCode: session.participant_code,
          enabledStages: session.stages,
        });
        const route = STAGE_ROUTES[session.current_stage as Stage];
        if (route && route !== location.pathname) navigate(route, { replace: true });
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn('Saved session could not be resumed:', err);
        // Only forget the session if the server says it doesn't exist; a
        // network blip keeps it so the next refresh can try again.
        if (err?.message === 'Session not found') {
          setSession({ sessionId: null, participantId: null, condition: null, currentStage: null });
          navigate('/', { replace: true });
        }
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
    // Only on first mount: later sessionId changes come from normal navigation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (checking) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>Resuming your session…</div>;
  }
  return <>{children}</>;
}
