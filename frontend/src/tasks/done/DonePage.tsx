import React, { useEffect, useState } from 'react';
import { useSessionContext, useSessionDispatch } from '../../orchestration/SessionContext';
import { completeStage, getSession } from '../../api/sessions';

interface Finished {
  code: string | null;
  moreSessions: boolean;
}

export function DonePage() {
  const { sessionId, participantCode } = useSessionContext();
  const setSession = useSessionDispatch();
  const [finished, setFinished] = useState<Finished | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const markDone = async () => {
      if (sessionId) {
        try {
          await completeStage(sessionId, { stage_name: 'done' });
          const session = await getSession(sessionId);
          setFinished({
            code: session.participant_code ?? participantCode,
            moreSessions: session.more_rounds,
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
