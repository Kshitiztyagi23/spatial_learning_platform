import React, { useState, useEffect } from 'react';
import { listSessions, SessionsResponse } from '../api/admin';
import { Button } from '../shared/Button';

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
      s.external_id.toLowerCase().includes(search.toLowerCase());

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
          <div className="admin-stat-title">Experimental (AI Hints)</div>
          <div className="admin-stat-value" style={{ color: '#3b82f6' }}>
            {data?.summary.experimental_count ?? 0}
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-title">Control Group</div>
          <div className="admin-stat-value" style={{ color: '#64748b' }}>
            {data?.summary.control_count ?? 0}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="admin-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flex: 1, minWidth: '280px' }}>
            <input
              type="text"
              placeholder="Search by student name, roll no, or ID..."
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
              <option value="experimental">Experimental (AI)</option>
              <option value="control">Control</option>
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
                <th>ID</th>
                <th>Name</th>
                <th>Grade / Section</th>
                <th>Roll No</th>
                <th>Assigned Condition</th>
                <th>Current Stage</th>
                <th>Status</th>
                <th>Started At</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                    {loading ? 'Loading sessions...' : 'No participant sessions found matching the filters.'}
                  </td>
                </tr>
              ) : (
                filteredSessions.map((s) => (
                  <tr key={s.session_id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{s.external_id}</td>
                    <td style={{ fontWeight: 500 }}>{s.name}</td>
                    <td>{s.grade} - {s.section}</td>
                    <td>{s.roll_no}</td>
                    <td>
                      <span className={`condition-pill ${s.condition}`}>
                        {s.condition === 'experimental' ? '🤖 Experimental' : 'Standard Control'}
                      </span>
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
