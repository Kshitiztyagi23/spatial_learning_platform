import React, { useState } from 'react';
import { ProtocolData, CatalogsData, ConditionSplit, getRecommendedSchedule, updateProtocol } from '../api/admin';
import { ScheduleEditor, resizeSchedule } from './ScheduleEditor';
import { GroupAssignmentPanel } from './GroupAssignmentPanel';
import { Button } from '../shared/Button';

interface Props {
  protocol: ProtocolData;
  catalogs: CatalogsData;
  onProtocolUpdated: (updated: ProtocolData) => void;
}

const GROUPS: { id: keyof ConditionSplit; label: string; description: string }[] = [
  { id: 'experimental', label: '🤖 AI feedback', description: 'Default: training tasks with AI hints' },
  { id: 'control', label: 'Tasks, no feedback', description: 'Default: same training tasks, no hints' },
  { id: 'natural_control', label: 'Tests only', description: 'Default: pre- and post-tests only' },
];

export function ProtocolConfigTab({ protocol, catalogs, onProtocolUpdated }: Props) {
  const [formData, setFormData] = useState<ProtocolData>(protocol);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const splitChanged = (Object.keys(protocol.condition_split) as (keyof ConditionSplit)[])
    .some(g => protocol.condition_split[g] !== formData.condition_split[g]);
  const splitTotal = formData.condition_split.experimental + formData.condition_split.control + formData.condition_split.natural_control;

  const handleResetSchedule = async () => {
    try {
      const round_schedule = await getRecommendedSchedule(formData.total_rounds);
      setFormData(prev => ({ ...prev, round_schedule }));
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not load the recommended design');
    }
  };

  const handlePtsotToggle = (num: number) => {
    const current = formData.ptsot_config.selected_questions;
    const next = current.includes(num)
      ? current.filter(n => n !== num)
      : [...current, num].sort((a, b) => a - b);
    setFormData(prev => ({
      ...prev,
      ptsot_config: { ...prev.ptsot_config, selected_questions: next }
    }));
  };

  const windowOrder = catalogs.window_questions.map(q => q.id);
  const sortWindow = (ids: string[]) => windowOrder.filter(id => ids.includes(id));

  const handleWindowToggle = (id: string) => {
    setFormData(prev => {
      const current = prev.window_config.selected_questions;
      const next = current.includes(id) ? current.filter(q => q !== id) : sortWindow([...current, id]);
      return { ...prev, window_config: { ...prev.window_config, selected_questions: next } };
    });
  };

  const setWindowSelection = (set: 'easy' | 'hard', on: boolean) => {
    setFormData(prev => {
      const setIds = catalogs.window_questions.filter(q => q.set === set).map(q => q.id);
      const others = prev.window_config.selected_questions.filter(id => !setIds.includes(id));
      return { ...prev, window_config: { ...prev.window_config, selected_questions: sortWindow(on ? [...others, ...setIds] : others) } };
    });
  };

  const handlePerspectiveToggle = (id: number) => {
    const current = formData.perspective_config.selected_scenarios;
    const next = current.includes(id)
      ? current.filter(n => n !== id)
      : [...current, id].sort((a, b) => a - b);
    setFormData(prev => ({
      ...prev,
      perspective_config: { ...prev.perspective_config, selected_scenarios: next }
    }));
  };

  const handleLegoToggle = (puzzleId: string) => {
    const current = formData.lego_config.selected_puzzles;
    const next = current.includes(puzzleId)
      ? current.filter(id => id !== puzzleId)
      : [...current, puzzleId];
    setFormData(prev => ({
      ...prev,
      lego_config: { ...prev.lego_config, selected_puzzles: next }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    setErrorMessage('');
    try {
      const updated = await updateProtocol(formData);
      onProtocolUpdated(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save protocol');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {saveSuccess && (
        <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#166534', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: 500 }}>
          ✓ Protocol saved successfully! Newly registered participants will automatically receive this session schedule and question allocation.
        </div>
      )}

      {errorMessage && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
          {errorMessage}
        </div>
      )}

      {/* 1. Study groups and rounds */}
      <div className="admin-card">
        <div className="admin-card-header">
          <div>
            <h3 className="admin-card-title">1. Study Groups & Sessions</h3>
            <p className="admin-card-desc">
              Every student does session 1 (the pre-test) without a group. Afterwards, press
              "Assign groups now" to split everyone who finished it into groups in these proportions.
              A student's group is permanent.
            </p>
          </div>
          <span className="admin-badge">Exact-proportion assignment</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '1rem' }}>
          {GROUPS.map(group => (
            <label key={group.id} className="item-chip-label" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.4rem', padding: '0.85rem 1rem' }}>
              <span style={{ fontWeight: 600 }}>{group.label}</span>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{group.description}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={formData.condition_split[group.id]}
                  onChange={(e) => {
                    const value = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                    setFormData(prev => ({ ...prev, condition_split: { ...prev.condition_split, [group.id]: value } }));
                  }}
                  style={{ width: '5rem', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
                %
              </span>
            </label>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, color: splitTotal === 100 ? '#16a34a' : '#dc2626' }}>
            Total: {splitTotal}%{splitTotal !== 100 && ' (must be 100%)'}
          </span>
          <button type="button" className="admin-tab-btn" style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} onClick={() => setFormData(prev => ({ ...prev, condition_split: { experimental: 34, control: 33, natural_control: 33 } }))}>
            Equal thirds
          </button>
        </div>

        <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <label htmlFor="total-rounds" style={{ fontWeight: 600 }}>Sessions per student</label>
          <input
            id="total-rounds"
            type="number"
            min={2}
            max={12}
            value={formData.total_rounds}
            onChange={(e) => {
              const total_rounds = Math.max(2, Math.min(12, Number(e.target.value) || 2));
              setFormData(prev => ({
                ...prev,
                total_rounds,
                round_schedule: resizeSchedule(prev.round_schedule, total_rounds),
                active_round: prev.active_round && prev.active_round > total_rounds ? null : prev.active_round,
              }));
            }}
            style={{ width: '5rem', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
          />
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Session 1 is the pre-test and session {formData.total_rounds} the post-test. What each group does in
            each session is set in the schedule below.
          </span>
        </div>

        <div style={{ marginTop: '1.25rem', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontWeight: 600 }}>
              Session running now
              <select
                value={formData.active_round ?? ''}
                onChange={(e) => setFormData(prev => ({ ...prev, active_round: e.target.value ? Number(e.target.value) : null }))}
                style={{ padding: '0.45rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 400 }}
              >
                <option value="">Any (students continue at their own pace)</option>
                {Array.from({ length: formData.total_rounds }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>
                    Session {n}{n === 1 ? ' (pre-test, new students join)' : n === formData.total_rounds ? ' (post-test)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontWeight: 600, flex: 1, minWidth: '240px' }}>
              Label for this sitting (saved on every session started)
              <input
                type="text"
                maxLength={120}
                placeholder="e.g. Session 2 - 15 Oct - School A"
                value={formData.run_label ?? ''}
                onChange={(e) => setFormData(prev => ({ ...prev, run_label: e.target.value || null }))}
                style={{ padding: '0.45rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 400 }}
              />
            </label>
          </div>
          <p style={{ margin: '0.6rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
            With a session chosen, only students due for it can start, and new students can only join on session 1.
            Unfinished sessions can always be finished. Save the protocol to apply.
          </p>
        </div>

        <GroupAssignmentPanel unsavedSplit={splitChanged} />
      </div>

      {/* 2. Session schedule */}
      <div className="admin-card">
        <div className="admin-card-header">
          <div>
            <h3 className="admin-card-title">2. Session Schedule</h3>
            <p className="admin-card-desc">
              For each group and session, choose which stages run and which tasks give hints. A session with
              nothing ticked is skipped by that group. Changes apply to sessions that start after saving.
            </p>
          </div>
          <span className="admin-badge" title={formData.ai_status?.model ?? undefined}>
            {formData.ai_status?.enabled
              ? `AI hints: ${formData.ai_status.provider} · ${formData.ai_status.model}`
              : 'AI not configured: hints use fixed text'}
          </span>
        </div>
        <ScheduleEditor
          schedule={formData.round_schedule}
          groups={GROUPS}
          onChange={(round_schedule) => setFormData(prev => ({ ...prev, round_schedule }))}
          onReset={handleResetSchedule}
        />
      </div>

      {/* 3. PTSOT Question Pool */}
      <div className="admin-card">
        <div className="admin-card-header">
          <div>
            <h3 className="admin-card-title">3. PTSOT Question Pool ({formData.ptsot_config.selected_questions.length} / 12 Selected)</h3>
            <p className="admin-card-desc">
              Customize which specific perspective items to administer out of the 12-question bank.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="admin-tab-btn"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              onClick={() => setFormData(prev => ({ ...prev, ptsot_config: { ...prev.ptsot_config, selected_questions: Array.from({ length: 12 }, (_, i) => i + 1) } }))}
            >
              All 12
            </button>
            <button
              type="button"
              className="admin-tab-btn"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              onClick={() => setFormData(prev => ({ ...prev, ptsot_config: { ...prev.ptsot_config, selected_questions: [1, 2, 3, 4, 5, 6] } }))}
            >
              Q1–Q6
            </button>
            <button
              type="button"
              className="admin-tab-btn"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              onClick={() => setFormData(prev => ({ ...prev, ptsot_config: { ...prev.ptsot_config, selected_questions: [7, 8, 9, 10, 11, 12] } }))}
            >
              Q7–Q12
            </button>
          </div>
        </div>

        <div className="item-grid" style={{ marginBottom: '1.25rem' }}>
          {catalogs.ptsot_questions.map(q => {
            const isSelected = formData.ptsot_config.selected_questions.includes(q.number);
            return (
              <label key={q.number} className={`item-chip-label ${isSelected ? 'selected' : ''}`}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handlePtsotToggle(q.number)}
                />
                <span>{q.label}</span>
              </label>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>
            Time Limit (Seconds):
            <input
              type="number"
              value={formData.ptsot_config.time_limit_seconds}
              onChange={(e) => setFormData(prev => ({ ...prev, ptsot_config: { ...prev.ptsot_config, time_limit_seconds: Number(e.target.value) } }))}
              style={{ marginLeft: '0.5rem', width: '90px', padding: '0.3rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
            />
          </label>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            ({Math.round(formData.ptsot_config.time_limit_seconds / 60)} minutes)
          </span>
        </div>
      </div>

      {/* Window Test Question Pool */}
      <div className="admin-card">
        <div className="admin-card-header">
          <div>
            <h3 className="admin-card-title">
              Window Test Question Pool ({formData.window_config.selected_questions.length} / {catalogs.window_questions.length} Selected)
            </h3>
            <p className="admin-card-desc">
              Pick questions from the easy (house) and hard (window grid) sets. Questions without an answer key
              (marked ⚠) are recorded but not scored until the key is added on the server.
            </p>
          </div>
        </div>

        {(['easy', 'hard'] as const).map(set => {
          const pool = catalogs.window_questions.filter(q => q.set === set);
          const ids = pool.map(q => q.id);
          const allOn = ids.every(id => formData.window_config.selected_questions.includes(id));
          return (
            <div key={set} style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <b>{set === 'easy' ? 'Easy (house)' : 'Hard (window grid)'}</b>
                <button
                  type="button"
                  className="admin-tab-btn"
                  style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  onClick={() => setWindowSelection(set, !allOn)}
                >
                  {allOn ? 'None' : 'All 12'}
                </button>
              </div>
              <div className="items-grid">
                {pool.map(q => {
                  const isSelected = formData.window_config.selected_questions.includes(q.id);
                  return (
                    <label key={q.id} className={`item-chip-label ${isSelected ? 'selected' : ''}`} title={q.has_answer ? undefined : 'No answer key yet'}>
                      <input type="checkbox" checked={isSelected} onChange={() => handleWindowToggle(q.id)} />
                      <span>Q{q.number}{q.has_answer ? '' : ' ⚠'}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Time limit (minutes, 0 = none)
            <input
              type="number"
              min={0}
              max={60}
              value={Math.round(formData.window_config.time_limit_seconds / 60)}
              onChange={(e) => setFormData(prev => ({ ...prev, window_config: { ...prev.window_config, time_limit_seconds: Math.max(0, Number(e.target.value) || 0) * 60 } }))}
              style={{ width: '4.5rem', padding: '0.35rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
            />
          </label>
          <label style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={formData.window_config.shuffle}
              onChange={(e) => setFormData(prev => ({ ...prev, window_config: { ...prev.window_config, shuffle: e.target.checked } }))}
            />
            Shuffle question order
          </label>
        </div>
      </div>

      {/* 4. Spatial Perspective Scenarios Pool */}
      <div className="admin-card">
        <div className="admin-card-header">
          <div>
            <h3 className="admin-card-title">4. Spatial Perspective Pool ({formData.perspective_config.selected_scenarios.length} / 8 Selected)</h3>
            <p className="admin-card-desc">
              Choose which visual perspective taking scenarios are assigned to students.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="admin-tab-btn"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              onClick={() => setFormData(prev => ({ ...prev, perspective_config: { ...prev.perspective_config, selected_scenarios: [1, 2, 3, 4, 5, 6, 7, 8] } }))}
            >
              All 8
            </button>
            <button
              type="button"
              className="admin-tab-btn"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              onClick={() => setFormData(prev => ({ ...prev, perspective_config: { ...prev.perspective_config, selected_scenarios: [1, 2, 3, 4] } }))}
            >
              Scenarios 1–4
            </button>
            <button
              type="button"
              className="admin-tab-btn"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              onClick={() => setFormData(prev => ({ ...prev, perspective_config: { ...prev.perspective_config, selected_scenarios: [5, 6, 7, 8] } }))}
            >
              Scenarios 5–8
            </button>
          </div>
        </div>

        <div className="item-grid">
          {catalogs.perspective_scenarios.map(sc => {
            const isSelected = formData.perspective_config.selected_scenarios.includes(sc.id);
            return (
              <label key={sc.id} className={`item-chip-label ${isSelected ? 'selected' : ''}`}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handlePerspectiveToggle(sc.id)}
                />
                <span>{sc.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* 5. 3D LEGO Puzzle Pool */}
      <div className="admin-card">
        <div className="admin-card-header">
          <div>
            <h3 className="admin-card-title">5. 3D LEGO Puzzle Pool ({formData.lego_config.selected_puzzles.length} / 21 Selected)</h3>
            <p className="admin-card-desc">
              Select which 3D reconstruction puzzles from each difficulty tier are loaded into the workbench.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="admin-tab-btn"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              onClick={() => setFormData(prev => ({ ...prev, lego_config: { ...prev.lego_config, selected_puzzles: catalogs.lego_puzzles.map(p => p.id) } }))}
            >
              Select All 21
            </button>
            <button
              type="button"
              className="admin-tab-btn"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              onClick={() => setFormData(prev => ({ ...prev, lego_config: { ...prev.lego_config, selected_puzzles: catalogs.lego_puzzles.filter(p => p.tier === 'Tutorial').map(p => p.id) } }))}
            >
              Tutorials Only
            </button>
          </div>
        </div>

        {/* Group by tiers */}
        {['Tutorial', 'Easy', 'Medium', 'Hard', 'Bonus'].map(tierName => {
          const tierPuzzles = catalogs.lego_puzzles.filter(p => p.tier === tierName);
          if (tierPuzzles.length === 0) return null;

          return (
            <div key={tierName} style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {tierName} Tier ({tierPuzzles.filter(p => formData.lego_config.selected_puzzles.includes(p.id)).length} / {tierPuzzles.length})
              </div>
              <div className="item-grid">
                {tierPuzzles.map(p => {
                  const isSelected = formData.lego_config.selected_puzzles.includes(p.id);
                  return (
                    <label key={p.id} className={`item-chip-label ${isSelected ? 'selected' : ''}`}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleLegoToggle(p.id)}
                      />
                      <span title={p.id}>{p.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}

      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', position: 'sticky', bottom: '1.5rem', zIndex: 10 }}>
        <Button variant="primary" onClick={handleSave} loading={saving} disabled={splitTotal !== 100}>
          Save & Apply Study Protocol ✓
        </Button>
      </div>
    </div>
  );
}
