import React from 'react';
import { useSessionContext } from '../orchestration/SessionContext';
import { ProgressBar } from './ProgressBar';

export function Layout({ children }: { children: React.ReactNode }) {
  const { currentStage } = useSessionContext();
  
  const displayStage = currentStage || 'intake_consent';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{ 
        backgroundColor: 'var(--sheet)', 
        borderBottom: '1px solid var(--border)', 
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Spatial Learning Platform</h1>
        <div style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
          Stage: {displayStage}
        </div>
      </header>
      
      <ProgressBar currentStage={displayStage} />

      <main style={{ flex: 1, padding: displayStage === 'lego' ? '1rem' : '2rem', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: displayStage === 'lego' ? '1600px' : '800px' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
