import React from 'react';
import { useLocation } from 'react-router-dom';
import { useSessionContext } from '../orchestration/SessionContext';
import { ProgressBar } from './ProgressBar';

const ROUTE_STAGE_MAP: Record<string, string> = {
  '/': 'intake_consent',
  '/demographics': 'demographics',
  '/experience': 'spatial_experience',
  '/ptsot': 'ptsot',
  '/perspective': 'spatial_perspective_taking',
  '/lego': 'lego',
  '/done': 'done',
};

export function Layout({ children }: { children: React.ReactNode }) {
  const { currentStage } = useSessionContext();
  const location = useLocation();
  
  // Resolve stage from context or current pathname
  const normalizedPath = location.pathname.replace(/\/$/, '') || '/';
  const displayStage = currentStage || ROUTE_STAGE_MAP[normalizedPath] || 'intake_consent';
  const isLego = displayStage === 'lego' || normalizedPath.startsWith('/lego');
  const isPerspective = displayStage === 'spatial_perspective_taking' || normalizedPath.startsWith('/perspective');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: isLego ? 'hidden' : 'auto' }}>
      <header style={{ 
        backgroundColor: 'var(--sheet)', 
        borderBottom: '1px solid var(--border)', 
        padding: '0.6rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0
      }}>
        <h1 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0 }}>Spatial Learning Platform</h1>
        <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
          Stage: {displayStage}
        </div>
      </header>
      
      <div style={{ flexShrink: 0 }}>
        <ProgressBar currentStage={displayStage} />
      </div>

      <main style={{ 
        flex: 1, 
        padding: isLego ? '0.5rem 1rem 0.75rem' : isPerspective ? '1rem 1.5rem 2rem' : '2rem', 
        display: 'flex', 
        justifyContent: 'center',
        minHeight: 0,
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ 
          width: '100%', 
          maxWidth: isLego ? '100%' : isPerspective ? '1600px' : '800px',
          height: isLego ? '100%' : 'auto',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0
        }}>
          {children}
        </div>
      </main>
    </div>
  );
}
