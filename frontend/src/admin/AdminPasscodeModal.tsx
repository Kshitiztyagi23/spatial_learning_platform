import React, { useState } from 'react';
import { verifyPasscode } from '../api/admin';
import { ADMIN_TOKEN_KEY } from '../api/client';
import { Button } from '../shared/Button';

interface Props {
  onAuthenticated: () => void;
}

export function AdminPasscodeModal({ onAuthenticated }: Props) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await verifyPasscode(passcode);
      if (res.valid && res.token) {
        sessionStorage.setItem(ADMIN_TOKEN_KEY, res.token);
        onAuthenticated();
      } else {
        setError(res.message || 'Incorrect passcode');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-layout" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div className="admin-auth-card">
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔒</div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Researcher Access</h2>
        <p style={{ color: 'var(--muted, #64748b)', fontSize: '0.9rem', margin: 0 }}>
          Enter the master researcher passcode to access the study management console.
        </p>

        {error && (
          <div style={{ color: 'var(--error, #dc2626)', fontSize: '0.875rem', marginTop: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            className="admin-auth-input"
            placeholder="••••••••"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            autoFocus
            required
          />

          <Button type="submit" variant="primary" loading={loading}>
            Unlock Console
          </Button>
        </form>

        <div style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
          Spatial Reasoning Study • IIT Kanpur
        </div>
      </div>
    </div>
  );
}
