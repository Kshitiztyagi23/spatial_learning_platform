import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../shared/Button';
import { useSessionDispatch } from '../../orchestration/SessionContext';
import { apiClient } from '../../api/client';
import { STAGE_ROUTES, Stage } from '../../orchestration/stages';

export function ConsentPage() {
  const [name, setName] = useState('');
  const [consent, setConsent] = useState(false);
  const [checkingProtocol, setCheckingProtocol] = useState(true);
  const [activeRound, setActiveRound] = useState<number | null>(null);
  const navigate = useNavigate();
  const setSession = useSessionDispatch();

  useEffect(() => {
    let isMounted = true;
    apiClient.get('/protocol/active', { params: { _t: Date.now() } })
      .then((res) => {
        if (!isMounted) return;
        const stages: string[] = res.data?.enabled_stages || [];
        setSession({ enabledStages: stages });
        const active = typeof res.data?.active_round === 'number' ? res.data.active_round : null;
        setActiveRound(active);
        if (active !== null && active !== 1) {
          // A later session is running: only returning students can continue
          setCheckingProtocol(false);
        } else if (stages.length > 0 && !stages.includes('intake_consent')) {
          const firstStage = (res.data.first_stage as Stage) || 'demographics';
          const targetRoute = STAGE_ROUTES[firstStage] || '/demographics';
          navigate(targetRoute, { replace: true });
        } else {
          setCheckingProtocol(false);
        }
      })
      .catch((err) => {
        console.warn('Failed to load active protocol:', err);
        if (isMounted) setCheckingProtocol(false);
      });

    return () => {
      isMounted = false;
    };
  }, [navigate, setSession]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && consent) {
      setSession({ currentStage: 'demographics' });
      navigate('/demographics', { state: { name } });
    }
  };

  const isFormValid = name.trim().length > 0 && consent;

  if (!checkingProtocol && activeRound !== null && activeRound !== 1) {
    return (
      <div className="card">
        <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 'bold' }}>Welcome back</h2>
        <p style={{ marginBottom: '1.5rem', color: 'var(--muted)' }}>
          Today the class is doing session {activeRound}. Use the code you were given after your first session.
        </p>
        <Link to="/return" className="btn-primary" style={{ display: 'inline-block', padding: '0.6rem 1.2rem', borderRadius: '6px', textDecoration: 'none' }}>
          Continue with your code
        </Link>
      </div>
    );
  }

  if (checkingProtocol) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
        <p>Loading session...</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 'bold' }}>Welcome to the Spatial Reasoning Study</h2>
      <p style={{ marginBottom: '1.5rem', lineHeight: 1.5, color: 'var(--muted)' }}>
        You are invited to take part in a research study on spatial reasoning at IIT Kanpur. 
        The study involves two tasks: a perspective-taking test and a 3D building activity. 
        Your responses will be kept confidential and used only for research purposes.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Your Full Name</label>
          <input 
            id="name"
            type="text" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your full name"
            required
          />
        </div>

        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input 
            id="consent"
            type="checkbox" 
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            required
            style={{ width: '1rem', height: '1rem', cursor: 'pointer' }}
          />
          <label htmlFor="consent" style={{ margin: 0, cursor: 'pointer', fontWeight: 400 }}>
            I agree to participate in this study
          </label>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <Button type="submit" variant="primary" disabled={!isFormValid}>
            Begin
          </Button>
        </div>
      </form>
      <p style={{ marginTop: '1.5rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
        Been here before? <Link to="/return">Continue with your code</Link>
      </p>
    </div>
  );
}
