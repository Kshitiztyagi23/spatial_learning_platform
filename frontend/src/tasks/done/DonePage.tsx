import React, { useEffect, useState } from 'react';
import { useSessionContext, useSessionDispatch } from '../../orchestration/SessionContext';
import { completeStage } from '../../api/sessions';

export function DonePage() {
  const { sessionId } = useSessionContext();
  const setSession = useSessionDispatch();
  const [error, setError] = useState('');

  useEffect(() => {
    const markDone = async () => {
      if (sessionId) {
        try {
          await completeStage(sessionId, { stage_name: 'done' });
          // Forget the finished session so the next participant on this tab starts fresh
          setSession({ sessionId: null, participantId: null, condition: null });
        } catch (err: any) {
          setError(err.message || 'Failed to mark session as done');
        }
      }
    };
    markDone();
  }, [sessionId]);

  return (
    <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
      <div style={{ 
        width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--success)', 
        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', 
        fontSize: '40px', margin: '0 auto 2rem' 
      }}>
        ✓
      </div>
      <h2 style={{ marginBottom: '1rem' }}>Thank you for participating!</h2>
      <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>
        Your responses have been saved. You may now close this tab.
      </p>
      
      {error && <div style={{ color: 'var(--error)', fontSize: '0.875rem' }}>Notice: {error}</div>}
    </div>
  );
}
