import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '@fontsource-variable/atkinson-hyperlegible-next';
import './styles/tokens.css';
import './styles/global.css';

import { useSession } from './state/session';
import { orderedTypeIds } from './core/pieces';
import { PuzzleBar } from './ui/PuzzleBar';
import { Tray } from './ui/Tray';
import { Stage } from './scene/Stage';
import { ViewsRow } from './ui/ViewsRow';
import { Toolbar } from './ui/Toolbar';
import { Feedback } from './ui/Feedback';
import { Button } from '../../shared/Button';
import { useSessionContext, useSessionDispatch } from '../../orchestration/SessionContext';
import { completeStage } from '../../api/sessions';
import { apiClient } from '../../api/client';

export function LegoTask() {
  const navigate = useNavigate();
  const { sessionId } = useSessionContext();
  const setSession = useSessionDispatch();
  const [isFinishing, setIsFinishing] = useState(false);

  // Keyboard navigation & tools (R to rotate, E to erase, Enter to check)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;

      const { rotateCW, selectType, runCheck, nextPuzzle, prevPuzzle, mode } = useSession.getState();

      switch (e.key) {
        case 'r':
        case 'R':
          rotateCW();
          break;
        case 'e':
        case 'E':
          useSession.setState({ mode: mode === 'build' ? 'erase' : 'build' });
          break;
        case 'Enter':
          runCheck();
          break;
        case 'ArrowLeft':
          prevPuzzle();
          break;
        case 'ArrowRight':
          nextPuzzle();
          break;
        default: {
          const slot = Number(e.key);
          if (Number.isInteger(slot) && slot >= 1 && slot <= 9) {
            const typeId = orderedTypeIds(useSession.getState().derived.tray)[slot - 1];
            if (typeId) selectType(typeId);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleFinishLegoTask = async () => {
    if (isFinishing) return;
    setIsFinishing(true);

    if (sessionId) {
      try {
        const state = useSession.getState();
        // Submit final build state
        await apiClient.post(`/sessions/${sessionId}/lego/submit`, {
          final_build_json: JSON.stringify(state.placed),
          duration_seconds: 600
        });

        // Complete LEGO stage
        await completeStage(sessionId, {
          stage_name: 'lego',
          payload: {
            puzzle_index: state.puzzleIndex,
            placements_count: state.placed.length
          }
        });

        setSession({ currentStage: 'done' });
        navigate('/done');
      } catch (err) {
        console.error('Failed to submit LEGO task:', err);
        setSession({ currentStage: 'done' });
        navigate('/done');
      }
    } else {
      setSession({ currentStage: 'done' });
      navigate('/done');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', height: 'calc(100vh - 150px)', minHeight: '650px' }}>
      {/* Top Controls Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--sheet)', padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid var(--rule)' }}>
        <div>
          <span style={{ fontWeight: 600, fontSize: '1.05rem' }}>3D LEGO Construction Activity</span>
          <span style={{ marginLeft: '1rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
            Build the 3D shape that matches all 3 orthographic views.
          </span>
        </div>
        <Button variant="primary" onClick={handleFinishLegoTask} loading={isFinishing}>
          Finish LEGO Activity ✓
        </Button>
      </div>

      {/* Main 3D Studio Workstation */}
      <div className="app-shell" style={{ height: '100%', minHeight: 'unset', padding: 0 }}>
        <header className="app-header" aria-label="Puzzle header">
          <PuzzleBar />
        </header>

        <main className="app-main">
          <aside className="app-tray-region" aria-label="Brick tray">
            <Tray />
          </aside>
          <section className="app-board-region" aria-label="3D board stage">
            <Stage />
            <Feedback />
          </section>
          <aside className="app-views-region" aria-label="Orthographic views">
            <ViewsRow />
          </aside>
        </main>

        <footer className="app-footer" aria-label="Toolbar">
          <Toolbar />
        </footer>
      </div>
    </div>
  );
}
