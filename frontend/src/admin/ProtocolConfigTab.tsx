import React, { useState } from 'react';
import { ProtocolData, CatalogsData, updateProtocol } from '../api/admin';
import { Button } from '../shared/Button';

interface Props {
  protocol: ProtocolData;
  catalogs: CatalogsData;
  onProtocolUpdated: (updated: ProtocolData) => void;
}

const AVAILABLE_STAGES = [
  { id: 'intake_consent', label: '1. Consent & Information' },
  { id: 'demographics', label: '2. Student Demographics (Grade, Section, Roll No)' },
  { id: 'spatial_experience', label: '3. Spatial Experience Survey (MCQs)' },
  { id: 'ptsot', label: '4. Perspective Taking Test (PTSOT)' },
  { id: 'spatial_perspective_taking', label: '5. Spatial Perspective Taking (Scenarios)' },
  { id: 'lego', label: '6. 3D LEGO Construction Workbench' },
];

export function ProtocolConfigTab({ protocol, catalogs, onProtocolUpdated }: Props) {
  const [formData, setFormData] = useState<ProtocolData>(protocol);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleStageToggle = (stageId: string) => {
    const current = formData.enabled_stages;
    let next: string[];
    if (current.includes(stageId)) {
      next = current.filter(s => s !== stageId);
    } else {
      next = [...current, stageId];
    }
    // Always keep 'done' as final concluding stage
    if (!next.includes('done')) {
      next.push('done');
    }
    setFormData(prev => ({ ...prev, enabled_stages: next }));
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

      {/* 1. AI Feedback Distribution Ratio */}
      <div className="admin-card">
        <div className="admin-card-header">
          <div>
            <h3 className="admin-card-title">1. AI Feedback Allocation Ratio</h3>
            <p className="admin-card-desc">
              Control what percentage of participants receive AI scaffolded feedback (Experimental) vs minimal standard feedback (Control).
            </p>
          </div>
          <span className="admin-badge">Weighted Random Engine</span>
        </div>

        <div className="slider-container">
          <div className="slider-labels-row">
            <span style={{ color: '#2563eb' }}>
              🤖 AI Feedback (Experimental): <b>{formData.ai_feedback_percentage}%</b>
            </span>
            <span style={{ color: '#475569' }}>
              Standard Control: <b>{100 - formData.ai_feedback_percentage}%</b>
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={formData.ai_feedback_percentage}
            onChange={(e) => setFormData(prev => ({ ...prev, ai_feedback_percentage: Number(e.target.value) }))}
            className="slider-input"
          />

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="button" className="admin-tab-btn" style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} onClick={() => setFormData(prev => ({ ...prev, ai_feedback_percentage: 50 }))}>
              50 / 50 Standard
            </button>
            <button type="button" className="admin-tab-btn" style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} onClick={() => setFormData(prev => ({ ...prev, ai_feedback_percentage: 100 }))}>
              100% Experimental (All AI)
            </button>
            <button type="button" className="admin-tab-btn" style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} onClick={() => setFormData(prev => ({ ...prev, ai_feedback_percentage: 0 }))}>
              0% AI (All Control)
            </button>
          </div>
        </div>
      </div>

      {/* 2. Today's Active Tasks */}
      <div className="admin-card">
        <div className="admin-card-header">
          <div>
            <h3 className="admin-card-title">2. Today's Active Tasks & Stages</h3>
            <p className="admin-card-desc">
              Select which tasks students will perform in today's study session (allows running single tasks per week or full sessions).
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {AVAILABLE_STAGES.map(stage => {
            const isChecked = formData.enabled_stages.includes(stage.id);
            return (
              <label
                key={stage.id}
                className={`item-chip-label ${isChecked ? 'selected' : ''}`}
                style={{ justifyContent: 'space-between', padding: '0.75rem 1rem' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleStageToggle(stage.id)}
                    style={{ width: '1.1rem', height: '1.1rem' }}
                  />
                  <span>{stage.label}</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: isChecked ? '#2563eb' : '#94a3b8', fontWeight: 600 }}>
                  {isChecked ? 'ACTIVE TODAY' : 'SKIPPED'}
                </span>
              </label>
            );
          })}
        </div>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={formData.lego_config.ai_hints_enabled}
              onChange={(e) => setFormData(prev => ({ ...prev, lego_config: { ...prev.lego_config, ai_hints_enabled: e.target.checked } }))}
              style={{ width: '1.1rem', height: '1.1rem' }}
            />
            Enable AI Diagnostic Guidance (for Experimental Group)
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', position: 'sticky', bottom: '1.5rem', zIndex: 10 }}>
        <Button variant="primary" onClick={handleSave} loading={saving}>
          Save & Apply Study Protocol ✓
        </Button>
      </div>
    </div>
  );
}
