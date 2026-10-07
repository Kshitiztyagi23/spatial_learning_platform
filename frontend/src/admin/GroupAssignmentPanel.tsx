import React, { useEffect, useState } from 'react';
import { assignGroups, getAssignmentStatus, type AssignmentStatus } from '../api/admin';
import { Button } from '../shared/Button';

const LABELS: Record<string, string> = {
  experimental: '🤖 AI feedback',
  control: 'Tasks, no feedback',
  natural_control: 'Tests only',
  unassigned: 'No group yet',
};

interface Props {
  /** True when the split on screen differs from the saved one */
  unsavedSplit: boolean;
}

/** Assign everyone who finished session 1 to a group, using the saved split. */
export function GroupAssignmentPanel({ unsavedSplit }: Props) {
  const [status, setStatus] = useState<AssignmentStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const refresh = () => {
    getAssignmentStatus()
      .then(setStatus)
      .catch(err => setError(err.message || 'Could not load group status'));
  };
  useEffect(refresh, []);

  const handleAssign = async () => {
    if (!status) return;
    const ok = window.confirm(
      `Assign ${status.waiting} student${status.waiting === 1 ? '' : 's'} to groups using the saved split ` +
      `(${status.split.experimental}% / ${status.split.control}% / ${status.split.natural_control}%)?\n\n` +
      'This is permanent: students keep their group for the rest of the study.'
    );
    if (!ok) return;
    setBusy(true);
    setError('');
    try {
      const res = await assignGroups();
      const parts = Object.entries(res.assigned).filter(([, n]) => n > 0).map(([g, n]) => `${n} to ${LABELS[g] ?? g}`);
      setMessage(res.total ? `Assigned ${res.total}: ${parts.join(', ')}.` : 'Nobody was waiting.');
      refresh();
    } catch (err: any) {
      setError(err.message || 'Assignment failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ marginTop: '1.25rem', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 600 }}>
            {status ? `${status.waiting} student${status.waiting === 1 ? ' has' : 's have'} finished session 1 and need${status.waiting === 1 ? 's' : ''} a group` : 'Loading…'}
          </div>
          {status && (
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
              Current groups: {Object.entries(status.group_counts).map(([g, n]) => `${LABELS[g] ?? g} ${n}`).join(' · ') || 'none yet'}
            </div>
          )}
        </div>
        <Button
          variant="primary"
          onClick={handleAssign}
          loading={busy}
          disabled={!status || status.waiting === 0 || unsavedSplit}
        >
          Assign groups now
        </Button>
      </div>
      {unsavedSplit && (
        <div style={{ fontSize: '0.85rem', color: '#a16207', marginTop: '0.5rem' }}>
          Save the protocol first: assignment uses the saved split.
        </div>
      )}
      {message && <div style={{ fontSize: '0.85rem', color: '#166534', marginTop: '0.5rem' }}>{message}</div>}
      {error && <div style={{ fontSize: '0.85rem', color: '#dc2626', marginTop: '0.5rem' }}>{error}</div>}
    </div>
  );
}
