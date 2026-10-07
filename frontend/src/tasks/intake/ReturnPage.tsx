import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../shared/Button';
import { lookupParticipant } from '../../api/participants';
import { createSession } from '../../api/sessions';
import type { ParticipantLookupOut } from '../../api/types';
import { useSessionDispatch } from '../../orchestration/SessionContext';
import { STAGE_ROUTES, type Stage } from '../../orchestration/stages';

/**
 * Later rounds: the student types the code they were given after their first
 * session, confirms their first name, and continues with their next round.
 */
export function ReturnPage() {
  const navigate = useNavigate();
  const setSession = useSessionDispatch();
  const [code, setCode] = useState('');
  const [found, setFound] = useState<ParticipantLookupOut | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      setFound(await lookupParticipant(code));
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    if (!found) return;
    setError('');
    setLoading(true);
    try {
      const session = await createSession({ participant_id: found.participant_id });
      setSession({
        participantId: found.participant_id,
        sessionId: session.id,
        condition: session.condition,
        participantCode: session.participant_code,
        currentStage: session.current_stage,
        enabledStages: session.stages,
      });
      navigate(STAGE_ROUTES[session.current_stage as Stage] || '/done');
    } catch (err: any) {
      setError(err.message || 'Could not start your session. Ask your teacher.');
      setLoading(false);
    }
  };

  const reset = () => {
    setFound(null);
    setCode('');
    setError('');
  };

  return (
    <div className="card">
      <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 'bold' }}>Welcome back</h2>

      {error && (
        <div role="alert" style={{ color: 'var(--error)', marginBottom: '1rem' }}>{error}</div>
      )}

      {!found && (
        <form onSubmit={handleLookup}>
          <div className="form-group">
            <label htmlFor="participant-code">Your code</label>
            <input
              id="participant-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="For example K7Q2XM"
              autoComplete="off"
              autoFocus
              maxLength={12}
              style={{ letterSpacing: '0.2em', fontWeight: 600 }}
              required
            />
          </div>
          <Button type="submit" variant="primary" loading={loading} disabled={code.trim().length < 4}>
            Find me
          </Button>
          <p style={{ marginTop: '1.5rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
            First time here? <Link to="/">Start from the beginning</Link>
          </p>
        </form>
      )}

      {found && found.status === 'waiting' && (
        <>
          <p style={{ marginBottom: '1.5rem' }}>
            Hi {found.first_name}, your next session isn't ready yet. Ask your teacher.
          </p>
          <Button variant="secondary" onClick={reset}>Use a different code</Button>
        </>
      )}

      {found && found.status === 'complete' && (
        <>
          <p style={{ marginBottom: '1.5rem' }}>
            {found.first_name}, you have finished every session of this study. Thank you for taking part.
          </p>
          <Button variant="secondary" onClick={reset}>Use a different code</Button>
        </>
      )}

      {found && found.status === 'ready' && (
        <>
          <p style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>
            Are you <b>{found.first_name}</b>?
          </p>
          <p style={{ marginBottom: '1.5rem', color: 'var(--muted)' }}>
            This is session {found.next_round} of {found.total_rounds}.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Button variant="primary" onClick={handleContinue} loading={loading}>Yes, continue</Button>
            <Button variant="secondary" onClick={reset} disabled={loading}>No, that's not me</Button>
          </div>
        </>
      )}
    </div>
  );
}
