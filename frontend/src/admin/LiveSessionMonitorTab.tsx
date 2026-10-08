import React, { useState, useEffect } from 'react';
import { listSessions, SessionsResponse } from '../api/admin';
import { Button } from '../shared/Button';

export const CONDITION_LABELS: Record<string, string> = {
  experimental: '🤖 AI feedback',
  control: 'Tasks, no feedback',
  natural_control: 'Tests only',
  unassigned: 'No group yet',
};

export function LiveSessionMonitorTab() {
  const [data, setData] = useState<SessionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('All');
  const [conditionFilter, setConditionFilter] = useState('All');

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await listSessions();
      setData(res);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 15000); // Auto-refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const sessions = data?.sessions || [];

  const filteredSessions = sessions.filter(s => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.roll_no.toLowerCase().includes(search.toLowerCase()) ||
      s.external_id.toLowerCase().includes(search.toLowerCase()) ||
      (s.participant_code ?? '').toLowerCase().includes(search.toLowerCase());

    const matchesGrade = gradeFilter === 'All' || s.grade === gradeFilter;
    const matchesCondition = conditionFilter === 'All' || s.condition === conditionFilter;

    return matchesSearch && matchesGrade && matchesCondition;
  });

  return (
    <div>
      {/* Metrics Row */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-title">Total Participants</div>
          <div className="admin-stat-value">{data?.summary.total_participants ?? 0}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-title">In Progress Now</div>
          <div className="admin-stat-value" style={{ color: '#2563eb' }}>
            {data?.summary.in_progress ?? 0}
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-title">Completed Study</div>
          <div className="admin-stat-value" style={{ color: '#16a34a' }}>
            {data?.summary.completed ?? 0}
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-title">AI Feedback Group</div>
          <div className="admin-stat-value" style={{ color: '#3b82f6' }}>
            {data?.summary.experimental_count ?? 0}
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-title">Tasks, No Feedback</div>
          <div className="admin-stat-value" style={{ color: '#64748b' }}>
            {data?.summary.control_count ?? 0}
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-title">Tests Only (Natural Control)</div>
          <div className="admin-stat-value" style={{ color: '#a16207' }}>
            {data?.summary.natural_control_count ?? 0}
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-title">No Group Yet</div>
          <div className="admin-stat-value" style={{ color: '#94a3b8' }}>
            {data?.summary.unassigned_count ?? 0}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="admin-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flex: 1, minWidth: '280px' }}>
            <input
              type="text"
              placeholder="Search by name, roll no, ID or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, padding: '0.6rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
            />
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              style={{ padding: '0.6rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
            >
              <option value="All">All Grades</option>
              <option value="Grade 5">Grade 5</option>
              <option value="Grade 6">Grade 6</option>
              <option value="Grade 7">Grade 7</option>
              <option value="Grade 8">Grade 8</option>
            </select>
            <select
              value={conditionFilter}
              onChange={(e) => setConditionFilter(e.target.value)}
              style={{ padding: '0.6rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
            >
              <option value="All">All Conditions</option>
              <option value="experimental">{CONDITION_LABELS.experimental}</option>
              <option value="control">{CONDITION_LABELS.control}</option>
              <option value="natural_control">{CONDITION_LABELS.natural_control}</option>
              <option value="unassigned">{CONDITION_LABELS.unassigned}</option>
            </select>
          </div>

          <Button variant="secondary" onClick={fetchSessions} loading={loading}>
            ↻ Refresh
          </Button>
        </div>

        {/* Sessions Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Grade / Section</th>
                <th>Roll No</th>
                <th>Group</th>
                <th>Session</th>
                <th>Current Stage</th>
                <th>Status</th>
                <th>Started At</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                    {loading ? 'Loading sessions...' : 'No participant sessions found matching the filters.'}
                  </td>
                </tr>
              ) : (
                filteredSessions.map((s) => (
                  <tr key={s.session_id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }} title={`ID ${s.external_id}`}>{s.participant_code ?? s.external_id}</td>
                    <td style={{ fontWeight: 500 }}>{s.name}</td>
                    <td>{s.grade} - {s.section}</td>
                    <td>{s.roll_no}</td>
                    <td>
                      <span className={`condition-pill ${s.condition}`}>
                        {CONDITION_LABELS[s.condition] ?? s.condition}
                      </span>
                    </td>
                    <td>
                      {s.round_number}
                      {s.session_label && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.session_label}</div>}
                    </td>
                    <td>
                      <span className={`stage-pill ${s.current_stage === 'done' ? 'done' : ''}`}>
                        {s.current_stage}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem', color: s.status === 'completed' ? '#16a34a' : '#2563eb', fontWeight: 500 }}>
                        {s.status === 'completed' ? '✓ Completed' : '● Active'}
                      </span>
                    </td>
                    <td style={{ color: '#64748b', fontSize: '0.8rem' }}>
                      {s.started_at ? new Date(s.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
