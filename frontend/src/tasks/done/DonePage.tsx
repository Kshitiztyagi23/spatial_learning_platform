import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionContext, useSessionDispatch } from '../../orchestration/SessionContext';
import { completeStage, createSession, getSession } from '../../api/sessions';
import { STAGE_ROUTES, type Stage } from '../../orchestration/stages';
import { Button } from '../../shared/Button';

interface Finished {
  code: string | null;
  moreSessions: boolean;
  demo: boolean;
  participantId: string;
  roundNumber: number;
}

export function DonePage() {
  const { sessionId, participantCode } = useSessionContext();
  const setSession = useSessionDispatch();
  const navigate = useNavigate();
  const [finished, setFinished] = useState<Finished | null>(null);
  const [error, setError] = useState('');
  const [continuing, setContinuing] = useState(false);

  useEffect(() => {
    const markDone = async () => {
      if (sessionId) {
        try {
          await completeStage(sessionId, { stage_name: 'done' });
          const session = await getSession(sessionId);
          setFinished({
            code: session.participant_code ?? participantCode,
            moreSessions: session.more_rounds,
            demo: session.demo,
            participantId: session.participant_id,
            roundNumber: session.round_number,
          });
          // Forget the finished session so the next participant on this tab starts fresh
          setSession({ sessionId: null, participantId: null, condition: null, participantCode: null });
        } catch (err: any) {
          setError(err.message || 'Failed to mark session as done');
        }
      }
    };
    markDone();
  }, [sessionId]);

  const moreSessions = finished?.moreSessions ?? false;

  // Demo mode: start the next session now instead of coming back with the code
  const continueDemo = async () => {
    if (!finished) return;
    setContinuing(true);
    setError('');
    try {
      const session = await createSession({ participant_id: finished.participantId });
      setSession({
        participantId: finished.participantId,
        sessionId: session.id,
        condition: session.condition,
        participantCode: session.participant_code,
        currentStage: session.current_stage,
        enabledStages: session.stages,
      });
      navigate(STAGE_ROUTES[session.current_stage as Stage] || '/done');
    } catch (err: any) {
      setError(err.message || 'Could not start the next session');
      setContinuing(false);
    }
  };

  if (finished?.demo && moreSessions) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Session {finished.roundNumber} done</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>
          Demo mode: your answers are saved. The next session starts straight away.
          {finished.code && <> Your code is <b>{finished.code}</b>.</>}
        </p>
        <Button variant="primary" onClick={continueDemo} loading={continuing}>
          Continue to the next session →
        </Button>
        {error && <div style={{ color: 'var(--error)', fontSize: '0.875rem', marginTop: '1rem' }}>Notice: {error}</div>}
      </div>
    );
  }

  return (
    <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
      <div style={{
        width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--success)',
        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '40px', margin: '0 auto 2rem'
      }}>
        ✓
      </div>
      <h2 style={{ marginBottom: '1rem' }}>Thank you for participating</h2>

      {moreSessions && finished?.code ? (
        <>
          <p style={{ color: 'var(--muted)', marginBottom: '1rem' }}>
            Your answers are saved. You will come back for another session.
          </p>
          <p style={{ marginBottom: '0.5rem' }}>Your code for next time:</p>
          <div
            aria-label={`Your code is ${finished.code.split('').join(' ')}`}
            style={{ fontSize: '2.25rem', fontWeight: 700, letterSpacing: '0.35em', margin: '0 0 1rem' }}
          >
            {finished.code}
          </div>
          <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>
            Ask your teacher to write it down before you close this page.
          </p>
        </>
      ) : finished && !moreSessions ? (
        <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>
          You have finished every session of this study. You may now close this tab.
        </p>
      ) : (
        <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>
          Your responses have been saved. You may now close this tab.
        </p>
      )}

      {error && <div style={{ color: 'var(--error)', fontSize: '0.875rem' }}>Notice: {error}</div>}
    </div>
  );
}
