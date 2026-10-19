import React, { useEffect, useState } from 'react';
import {
  listSceneMaps, generateSceneMap, saveSceneMap, listReports, regenerateReport, listHints, downloadExport,
  SceneMapItem, ReportListItem, HintReviewItem, SessionReport,
} from '../api/admin';

const errorText = (err: any) => err?.response?.data?.detail || err?.message || 'Request failed';
const when = (iso: string | null) => (iso ? new Date(iso + (iso.endsWith('Z') ? '' : 'Z')).toLocaleString() : '—');
const muted: React.CSSProperties = { color: '#64748b', fontSize: '0.85rem' };

// ---- Park scene maps: AI drafts once from the photos, a researcher approves ----------

function SceneMapCard({ item, onChange }: { item: SceneMapItem; onChange: (m: SceneMapItem) => void }) {
  const [text, setText] = useState(item.map?.map_text ?? '');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const run = async (label: string, action: () => Promise<SceneMapItem>) => {
    setBusy(label);
    setError('');
    try {
      const updated = await action();
      setText(updated.map?.map_text ?? '');
      onChange(updated);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy('');
    }
  };

  const status = item.map?.status;
  return (
    <div className="admin-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <h4 style={{ margin: 0 }}>Scenario {item.scenario_id}: {item.title}</h4>
        <span className="admin-badge">{status === 'approved' ? '✅ Approved, tutor uses it' : status === 'draft' ? 'Draft, not used yet' : 'No map'}</span>
      </div>
      {!item.has_photos && <p style={muted}>No photos yet, so no map can be made. Until a map is approved, park hints are the reworded rule hint.</p>}
      {item.has_photos && (
        <>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={text ? 12 : 3}
            placeholder="Generate a draft from the photos, then check every line against the photos before approving."
            style={{ width: '100%', marginTop: '0.75rem', fontFamily: 'monospace', fontSize: '0.85rem', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" disabled={!!busy} onClick={() => run('generate', () => generateSceneMap(item.scenario_id))}>
              {busy === 'generate' ? 'AI is reading the photos…' : item.map ? 'Regenerate draft' : 'Generate draft from photos'}
            </button>
            <button type="button" disabled={!!busy || !text.trim()} onClick={() => run('draft', () => saveSceneMap(item.scenario_id, text, 'draft'))}>
              Save as draft
            </button>
            <button type="button" disabled={!!busy || !text.trim()} onClick={() => run('approve', () => saveSceneMap(item.scenario_id, text, 'approved'))}>
              Save and approve
            </button>
            {item.map && <span style={muted}>by {item.map.model ?? 'researcher'}, {when(item.map.generated_at)}</span>}
          </div>
        </>
      )}
      {error && <p style={{ color: '#dc2626', fontSize: '0.85rem' }}>{error}</p>}
    </div>
  );
}

// ---- Session reports --------------------------------------------------------------------

function ReportBody({ report }: { report: SessionReport }) {
  const body = report.report;
  const list = (title: string, items: string[]) => items.length > 0 && (
    <div><strong>{title}</strong><ul style={{ margin: '0.25rem 0 0.5rem' }}>{items.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
  );
  return (
    <div style={{ fontSize: '0.9rem' }}>
      {body ? (
        <>
          <p style={{ marginTop: 0 }}>{body.summary}</p>
          {list('Strengths', body.strengths)}
          {list('Difficulties', body.difficulties)}
          {list('Error patterns', body.error_patterns)}
          {list('Strategies', body.strategy_observations)}
          <p><strong>Response to hints:</strong> {body.response_to_hints}</p>
          <p><strong>Next focus:</strong> {body.next_focus}</p>
        </>
      ) : (
        <p style={muted}>{report.status === 'failed' ? `AI reading failed: ${report.error}` : 'Facts only (AI not configured when the session ended).'}</p>
      )}
      <details>
        <summary style={muted}>Facts computed by the server</summary>
        <pre style={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>{JSON.stringify(report.facts, null, 2)}</pre>
      </details>
    </div>
  );
}

function ReportsSection() {
  const [items, setItems] = useState<ReportListItem[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = () => listReports().then(setItems).catch(err => setError(errorText(err)));
  useEffect(() => { load(); }, []);

  const regenerate = async (sessionId: string) => {
    setBusy(sessionId);
    setError('');
    try {
      const report = await regenerateReport(sessionId);
      setItems(prev => prev.map(r => (r.session_id === sessionId ? { ...r, report } : r)));
      setOpen(sessionId);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="admin-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0 }}>Session reports</h4>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" onClick={load}>Refresh</button>
          <button type="button" onClick={() => downloadExport('session_reports').catch(err => setError(errorText(err)))}>📥 CSV</button>
        </div>
      </div>
      <p style={muted}>Made automatically when a session ends (every group). The numbers come from the server; the AI only writes the reading. Its summary also briefs the tutor in the student's next session.</p>
      {error && <p style={{ color: '#dc2626', fontSize: '0.85rem' }}>{error}</p>}
      {items.length === 0 ? <p style={muted}>No finished sessions yet.</p> : (
        <table className="admin-table">
          <thead><tr><th>Ended</th><th>Code</th><th>Group</th><th>Session</th><th>Report</th><th /></tr></thead>
          <tbody>
            {items.map(r => (
              <React.Fragment key={r.session_id}>
                <tr>
                  <td>{when(r.ended_at)}</td>
                  <td>{r.participant_code}</td>
                  <td>{r.condition}</td>
                  <td>{r.round_number}{r.session_label ? ` (${r.session_label})` : ''}</td>
                  <td>
                    {r.report
                      ? <button type="button" onClick={() => setOpen(open === r.session_id ? null : r.session_id)}>
                          {r.report.status === 'ready' ? 'View' : r.report.status === 'failed' ? 'Failed: view' : 'Facts only: view'}
                        </button>
                      : <span style={muted}>Not made yet</span>}
                  </td>
                  <td>
                    <button type="button" disabled={busy !== null} onClick={() => regenerate(r.session_id)}>
                      {busy === r.session_id ? 'Writing…' : r.report ? 'Regenerate' : 'Generate'}
                    </button>
                  </td>
                </tr>
                {open === r.session_id && r.report && (
                  <tr><td colSpan={6}><ReportBody report={r.report} /></td></tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ---- Hint review --------------------------------------------------------------------------

function HintReviewSection() {
  const [items, setItems] = useState<HintReviewItem[]>([]);
  const [error, setError] = useState('');
  const load = () => listHints().then(setItems).catch(err => setError(errorText(err)));
  useEffect(() => { load(); }, []);

  return (
    <div className="admin-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0 }}>Hints students saw (latest 200)</h4>
        <button type="button" onClick={load}>Refresh</button>
      </div>
      <p style={muted}>Check that hints are specific, never give the answer, and don't repeat. "rule" means the AI was unavailable or its hint was rejected by the safety checks.</p>
      {error && <p style={{ color: '#dc2626', fontSize: '0.85rem' }}>{error}</p>}
      {items.length === 0 ? <p style={muted}>No hints yet.</p> : (
        <table className="admin-table">
          <thead><tr><th>Time</th><th>Code</th><th>Task / item</th><th>Tries</th><th>Hint</th><th>By</th><th>Label</th><th>Fixed after?</th></tr></thead>
          <tbody>
            {items.map(h => (
              <tr key={h.feedback_id}>
                <td>{when(h.shown_at)}</td>
                <td>{h.participant_code} · S{h.round_number}</td>
                <td>{h.task_type === 'lego' ? 'LEGO' : 'Park'} {h.item_id}</td>
                <td>{h.failed_tries ?? '—'}</td>
                <td title={h.rule_message ? `Rule hint: ${h.rule_message}` : undefined}>{h.message}</td>
                <td>{h.generated_by}</td>
                <td>{h.label ?? '—'}</td>
                <td>{h.corrected === null ? '—' : h.corrected ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function AiTutorTab() {
  const [maps, setMaps] = useState<SceneMapItem[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { listSceneMaps().then(setMaps).catch(err => setError(errorText(err))); }, []);

  return (
    <div>
      <ReportsSection />
      <HintReviewSection />
      <h3 style={{ fontSize: '1.1rem', margin: '1.5rem 0 0.5rem' }}>Park scene maps</h3>
      <p style={muted}>The park tutor never sees photos during the task. The AI reads each scenario's photos once and writes a layout map; check it carefully, fix any mistakes and approve it. Only approved maps are used.</p>
      {error && <p style={{ color: '#dc2626', fontSize: '0.85rem' }}>{error}</p>}
      {maps.map(m => (
        <SceneMapCard key={m.scenario_id} item={m}
          onChange={updated => setMaps(prev => prev.map(x => (x.scenario_id === updated.scenario_id ? updated : x)))} />
      ))}
    </div>
  );
}
