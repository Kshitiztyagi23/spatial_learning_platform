import React, { useState } from 'react';
import type { ConditionSplit, RoundPlan, RoundSchedule } from '../api/admin';

type Group = keyof ConditionSplit;

export const SCHEDULE_STAGES: { id: string; label: string }[] = [
  { id: 'intake_consent', label: 'Consent' },
  { id: 'demographics', label: 'Details' },
  { id: 'spatial_experience', label: 'Experience survey' },
  { id: 'ptsot', label: 'PTSOT' },
  { id: 'window_test', label: 'Window test' },
  { id: 'spatial_perspective_taking', label: 'Park perspective' },
  { id: 'lego', label: 'LEGO' },
];
// Tasks with a hint implementation (keep in sync with FEEDBACK_STAGES in study_design.py)
const FEEDBACK_STAGES = new Set(['spatial_perspective_taking', 'lego']);
// Consent and demographics create the participant, so only session 1 has them
const FIRST_ROUND_ONLY = new Set(['intake_consent', 'demographics']);

const STAGE_ORDER = SCHEDULE_STAGES.map(s => s.id);
const ordered = (ids: Iterable<string>) => {
  const set = new Set(ids);
  return STAGE_ORDER.filter(id => set.has(id));
};

/** Change the number of sessions, keeping each group's final session and
 *  adding/removing middle sessions (new ones copy an existing middle one). */
export function resizeSchedule(schedule: RoundSchedule, totalRounds: number): RoundSchedule {
  const later = totalRounds - 1; // sessions 2..N
  const groups = {} as RoundSchedule['groups'];
  for (const [group, plans] of Object.entries(schedule.groups) as [Group, RoundPlan[]][]) {
    if (plans.length === later || plans.length === 0) {
      groups[group] = plans;
      continue;
    }
    const last = plans[plans.length - 1]!;
    const middle = plans.slice(0, -1);
    const template = middle[middle.length - 1] ?? { stages: [], feedback: [] };
    while (middle.length < later - 1) middle.push({ stages: [...template.stages], feedback: [...template.feedback] });
    groups[group] = [...middle.slice(0, later - 1), last];
  }
  return { ...schedule, groups };
}

interface RowProps {
  label: React.ReactNode;
  plan: RoundPlan;
  firstSession: boolean;
  onChange: (plan: RoundPlan) => void;
}

function ScheduleRow({ label, plan, firstSession, onChange }: RowProps) {
  const toggleStage = (stage: string) => {
    const running = plan.stages.includes(stage);
    onChange({
      stages: running ? plan.stages.filter(s => s !== stage) : ordered([...plan.stages, stage]),
      feedback: running ? plan.feedback.filter(s => s !== stage) : plan.feedback,
    });
  };
  const toggleHints = (stage: string) => {
    const on = plan.feedback.includes(stage);
    onChange({ ...plan, feedback: on ? plan.feedback.filter(s => s !== stage) : ordered([...plan.feedback, stage]) });
  };

  return (
    <tr style={plan.stages.length === 0 ? { background: '#f8fafc' } : undefined}>
      <td style={{ whiteSpace: 'nowrap' }}>
        {label}
        {plan.stages.length === 0 && (
          <div style={{ color: '#a16207', fontSize: '0.75rem', fontWeight: 600 }}>skipped by this group</div>
        )}
      </td>
      {SCHEDULE_STAGES.map(stage => {
        if (!firstSession && FIRST_ROUND_ONLY.has(stage.id)) {
          return <td key={stage.id} style={{ color: '#cbd5e1', textAlign: 'center' }} title="Only in session 1">–</td>;
        }
        const locked = firstSession && stage.id === 'demographics';
        const running = locked || plan.stages.includes(stage.id);
        const hintsOn = plan.feedback.includes(stage.id);
        return (
          <td key={stage.id}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }} title={locked ? 'Required: the student record and code are created here' : undefined}>
              <input type="checkbox" checked={running} disabled={locked} onChange={() => toggleStage(stage.id)} aria-label={`${stage.label} runs`} />
              runs
            </label>
            {/* No hints in session 1: nobody has a group yet */}
            {!firstSession && FEEDBACK_STAGES.has(stage.id) && running && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: hintsOn ? '#1d4ed8' : '#64748b', marginTop: '0.25rem' }}>
                <input type="checkbox" checked={hintsOn} onChange={() => toggleHints(stage.id)} aria-label={`${stage.label} hints`} />
                🤖 hints
              </label>
            )}
          </td>
        );
      })}
    </tr>
  );
}

function ScheduleTable({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Session</th>
            {SCHEDULE_STAGES.map(s => <th key={s.id}>{s.label}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

interface Props {
  schedule: RoundSchedule;
  groups: { id: Group; label: string }[];
  onChange: (schedule: RoundSchedule) => void;
  onReset: () => void;
}

export function ScheduleEditor({ schedule, groups, onChange, onReset }: Props) {
  const [group, setGroup] = useState<Group>(groups[0]!.id);
  const plans = schedule.groups[group] ?? [];
  const total = plans.length + 1;

  const updateGroupSession = (idx: number, plan: RoundPlan) => {
    onChange({ ...schedule, groups: { ...schedule.groups, [group]: plans.map((p, i) => (i === idx ? plan : p)) } });
  };

  return (
    <div>
      <h4 style={{ margin: '0 0 0.25rem 0' }}>Session 1: every student (before groups)</h4>
      <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: '#64748b' }}>
        Students get their code at the end. Assign groups (above) once they've finished it.
      </p>
      <ScheduleTable>
        <ScheduleRow
          label={<><b>1</b> <span style={{ color: '#64748b', fontSize: '0.8rem' }}>pre-test</span></>}
          plan={schedule.session_1}
          firstSession
          onChange={(session_1) => onChange({ ...schedule, session_1 })}
        />
      </ScheduleTable>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '1.5rem 0 0.75rem', flexWrap: 'wrap' }}>
        <h4 style={{ margin: 0, marginRight: '0.5rem' }}>Sessions 2–{total}, per group</h4>
        <div role="tablist" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {groups.map(g => (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={group === g.id}
              className="admin-tab-btn"
              onClick={() => setGroup(g.id)}
              style={{ padding: '0.4rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: group === g.id ? 700 : 500, background: group === g.id ? '#eff6ff' : undefined }}
            >
              {g.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="admin-tab-btn"
          onClick={onReset}
          style={{ marginLeft: 'auto', padding: '0.4rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
        >
          Reset schedule to recommended design
        </button>
      </div>
      <ScheduleTable>
        {plans.map((plan, i) => (
          <ScheduleRow
            key={i}
            label={<><b>{i + 2}</b> <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{i + 2 === total ? 'post-test' : 'training'}</span></>}
            plan={plan}
            firstSession={false}
            onChange={(p) => updateGroupSession(i, p)}
          />
        ))}
      </ScheduleTable>
    </div>
  );
}
