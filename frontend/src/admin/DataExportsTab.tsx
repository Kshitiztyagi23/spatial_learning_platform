import React, { useState } from 'react';
import { downloadExport } from '../api/admin';

interface ExportCardProps {
  title: string;
  description: string;
  exportType: string;
  badge: string;
}

function ExportCard({ title, description, exportType, badge }: ExportCardProps) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const handleDownload = async () => {
    setDownloading(true);
    setError('');
    try {
      await downloadExport(exportType);
    } catch (err: any) {
      setError(err.message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="admin-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
          <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{title}</h4>
          <span className="admin-badge">{badge}</span>
        </div>
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
          {description}
        </p>
        {error && (
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--error, #dc2626)' }}>{error}</p>
        )}
      </div>

      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        style={{
          border: 'none',
          cursor: downloading ? 'wait' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.65rem 1.25rem',
          background: 'var(--accent, #2563eb)',
          color: '#ffffff',
          borderRadius: '6px',
          textDecoration: 'none',
          fontWeight: 500,
          fontSize: '0.9rem',
          whiteSpace: 'nowrap'
        }}
      >
        {downloading ? 'Preparing…' : '📥 Download CSV'}
      </button>
    </div>
  );
}

export function DataExportsTab() {
  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, margin: '0 0 0.5rem 0' }}>Research Data Exports</h3>
        <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
          Download clean, pre-processed datasets directly from the PostgreSQL database formatted for statistical analysis in R, SPSS, or Python Pandas.
        </p>
      </div>

      <ExportCard
        title="1. Participants & Demographics"
        description="Includes participant ID, name, grade, section, roll number, age, gender, assigned study condition, and consent status."
        exportType="participants"
        badge="Demographics"
      />

      <ExportCard
        title="2. PTSOT Trials & Performance"
        description="Granular trial-by-trial logs: trial number, chosen angle, correct angle, absolute error (degrees), correctness flag, and reaction time (ms)."
        exportType="ptsot_trials"
        badge="2D Perspective"
      />

      <ExportCard
        title="3. Spatial Perspective Taking Trials"
        description="Per-question answers for the park scenarios: chosen direction, correct direction, correctness flag, and reaction time (ms)."
        exportType="perspective_trials"
        badge="Scenarios"
      />

      <ExportCard
        title="4. 3D LEGO Interaction Logs"
        description="Comprehensive real-time telemetry: every block placement, removal, rotation, coordinates, and timestamp."
        exportType="lego_events"
        badge="3D Telemetry"
      />

      <ExportCard
        title="5. LEGO Final Submissions"
        description="Final build evaluations: duration in seconds, shape accuracy, and efficiency metrics."
        exportType="lego_submissions"
        badge="Summary Scores"
      />
    </div>
  );
}
