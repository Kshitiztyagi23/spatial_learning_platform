import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../shared/Button';
import { useSessionDispatch } from '../../orchestration/SessionContext';

export function ConsentPage() {
  const [name, setName] = useState('');
  const [consent, setConsent] = useState(false);
  const navigate = useNavigate();
  const setSession = useSessionDispatch();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && consent) {
      setSession({ currentStage: 'demographics' });
      navigate('/demographics', { state: { name } });
    }
  };

  const isFormValid = name.trim().length > 0 && consent;

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
    </div>
  );
}
