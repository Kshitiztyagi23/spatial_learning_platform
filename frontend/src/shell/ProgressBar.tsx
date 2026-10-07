import React from 'react';

const ALL_STEPS = [
  { id: 'intake_consent', label: 'Consent' },
  { id: 'demographics', label: 'Details' },
  { id: 'spatial_experience', label: 'Experience' },
  { id: 'ptsot', label: 'PTSOT' },
  { id: 'spatial_perspective_taking', label: 'Perspective' },
  { id: 'lego', label: 'LEGO' },
  { id: 'done', label: 'Done' }
];

interface ProgressBarProps {
  currentStage: string;
  enabledStages?: string[] | null;
}

export function ProgressBar({ currentStage, enabledStages }: ProgressBarProps) {
  const steps = enabledStages && enabledStages.length > 0
    ? ALL_STEPS.filter(s => enabledStages.includes(s.id) || s.id === 'done')
    : ALL_STEPS;

  const currentIndex = steps.findIndex(s => s.id === currentStage) >= 0 
    ? steps.findIndex(s => s.id === currentStage) 
    : 0;

  const totalSteps = Math.max(1, steps.length - 1);
  const progressPercent = totalSteps > 1
    ? (Math.min(currentIndex, totalSteps - 1) / (totalSteps - 1)) * 100
    : 100;

  return (
    <div style={{ backgroundColor: 'var(--sheet)', padding: '0.75rem 2rem', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '850px', margin: '0 auto', position: 'relative' }}>
        {/* Background line */}
        <div style={{ position: 'absolute', top: '50%', left: '0', right: '0', height: '2px', backgroundColor: 'var(--border)', zIndex: 0, transform: 'translateY(-50%)' }} />
        
        {/* Active line */}
        <div style={{ 
          position: 'absolute', top: '50%', left: '0', height: '2px', 
          backgroundColor: 'var(--accent)', zIndex: 0, transform: 'translateY(-50%)',
          width: `${progressPercent}%`,
          transition: 'width 0.3s ease'
        }} />

        {steps.slice(0, steps.length - 1).map((step, index) => {
          const isCompleted = index < currentIndex;
          const isActive = index === currentIndex;
          
          return (
            <div key={step.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 }}>
              <div style={{ 
                width: '24px', height: '24px', borderRadius: '50%', 
                backgroundColor: isCompleted || isActive ? 'var(--accent)' : 'var(--sheet)',
                border: `2px solid ${isCompleted || isActive ? 'var(--accent)' : 'var(--border)'}`,
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                color: 'var(--sheet)', fontSize: '12px', fontWeight: 'bold'
              }}>
                {isCompleted ? '✓' : index + 1}
              </div>
              <div style={{ 
                marginTop: '0.5rem', fontSize: '0.75rem', 
                color: isActive ? 'var(--ink)' : 'var(--muted)',
                fontWeight: isActive ? 600 : 400
              }}>
                {step.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
