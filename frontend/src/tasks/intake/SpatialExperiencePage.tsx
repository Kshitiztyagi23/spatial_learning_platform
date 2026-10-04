import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../shared/Button';
import { useSessionContext, useSessionDispatch } from '../../orchestration/SessionContext';
import { completeStage } from '../../api/sessions';

const Q1_OPTIONS = ["Never", "A few times a year", "A few times a month", "Every week"];
const Q2_OPTIONS = ["Very difficult", "Somewhat difficult", "Somewhat easy", "Very easy"];
const Q3_OPTIONS = ["Never", "Once or twice", "Sometimes", "Often"];

export function SpatialExperiencePage() {
  const navigate = useNavigate();
  const { sessionId } = useSessionContext();
  const setSession = useSessionDispatch();
  
  const [q1, setQ1] = useState('');
  const [q2, setQ2] = useState('');
  const [q3, setQ3] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isComplete = q1 !== '' && q2 !== '' && q3 !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId) {
      setError("Session not found. Please restart.");
      return;
    }
    
    setLoading(true);
    try {
      await completeStage(sessionId, {
        stage_name: 'spatial_experience',
        payload: { q1, q2, q3 }
      });
      setSession({ currentStage: 'ptsot' });
      navigate('/ptsot');
    } catch (err: any) {
      setError(err.message || "Failed to submit responses");
    } finally {
      setLoading(false);
    }
  };

  const renderRadios = (name: string, options: string[], value: string, setValue: (val: string) => void) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
        {options.map(opt => (
          <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 400 }}>
            <input 
              type="radio" 
              name={name} 
              value={opt} 
              checked={value === opt} 
              onChange={() => setValue(opt)}
            />
            {opt}
          </label>
        ))}
      </div>
    );
  };

  return (
    <div className="card">
      <h2 style={{ marginBottom: '1.5rem' }}>Spatial Experience</h2>
      {error && <div style={{ color: 'var(--error)', marginBottom: '1rem' }}>{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group" style={{ marginBottom: '2rem' }}>
          <label style={{ fontSize: '1.1rem', fontWeight: 500 }}>
            1. How often do you build things with physical blocks, LEGO bricks, or similar construction toys?
          </label>
          {renderRadios('q1', Q1_OPTIONS, q1, setQ1)}
        </div>

        <div className="form-group" style={{ marginBottom: '2rem' }}>
          <label style={{ fontSize: '1.1rem', fontWeight: 500 }}>
            2. How easy do you find it to imagine what an object looks like from a different angle or viewpoint?
          </label>
          {renderRadios('q2', Q2_OPTIONS, q2, setQ2)}
        </div>

        <div className="form-group" style={{ marginBottom: '2rem' }}>
          <label style={{ fontSize: '1.1rem', fontWeight: 500 }}>
            3. Have you ever played a video game or used an app where you needed to navigate or build in 3D (like Minecraft)?
          </label>
          {renderRadios('q3', Q3_OPTIONS, q3, setQ3)}
        </div>

        <div style={{ marginTop: '2rem' }}>
          <Button type="submit" variant="primary" disabled={!isComplete} loading={loading}>
            Continue
          </Button>
        </div>
      </form>
    </div>
  );
}
