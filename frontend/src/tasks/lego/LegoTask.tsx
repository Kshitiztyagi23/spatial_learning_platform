import React, { useState, useEffect, useRef } from 'react';
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
import { completeStage, getNextStage } from '../../api/sessions';
import { STAGE_ROUTES, type Stage as StudyStage } from '../../orchestration/stages';
import { apiClient } from '../../api/client';
import { startLegoTelemetry } from './telemetry';

export function LegoTask() {
  const navigate = useNavigate();
  const { sessionId } = useSessionContext();
  const setSession = useSessionDispatch();
  const [isFinishing, setIsFinishing] = useState(false);
  const startedAt = useRef(Date.now());
  const telemetry = useRef<ReturnType<typeof startLegoTelemetry> | null>(null);

  // Restrict the puzzle set to what the active study protocol selects, then
  // start logging build actions (logging failures never interrupt the child)
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    const send = (event: object) => {
      apiClient.post(`/sessions/${sessionId}/lego/events`, event)
        .catch(err => console.warn('LEGO event not recorded:', err));
    };
    apiClient.get(`/sessions/${sessionId}/task-config/lego`)
      .then(res => {
        const ids = res.data?.selected_puzzles;
        if (!cancelled && Array.isArray(ids)) useSession.getState().setPuzzleFilter(ids);
      })
      .catch(err => {
        console.warn('Using full LEGO puzzle set:', err);
      })
      .finally(() => {
        if (!cancelled) telemetry.current = startLegoTelemetry(send);
      });
    return () => {
      cancelled = true;
      telemetry.current?.stop();
      telemetry.current = null;
    };
  }, [sessionId]);

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
          final_build_json: JSON.stringify({ puzzle_id: state.derived.puzzle.id, placed: state.placed }),
          duration_seconds: Math.round((Date.now() - startedAt.current) / 1000),
          puzzle_count: state.puzzleCount,
          results: telemetry.current?.results() ?? []
        });

        // Complete LEGO stage
        await completeStage(sessionId, {
          stage_name: 'lego',
          payload: {
            puzzle_index: state.puzzleIndex,
            placements_count: state.placed.length
          }
        });

        const next = await getNextStage(sessionId);
        setSession({ currentStage: next.stage_name });
        const route = STAGE_ROUTES[next.stage_name as StudyStage] || '/done';
        navigate(route);
      } catch (err) {
        console.error('Failed to submit LEGO task:', err);
        const route = STAGE_ROUTES['done'] || '/done';
        navigate(route);
      }
    } else {
      navigate('/done');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', height: '100%', flex: 1, minHeight: 0 }}>
      {/* Top Controls Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--sheet)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--rule)', flexShrink: 0 }}>
        <div>
          <span style={{ fontWeight: 600, fontSize: '1rem' }}>3D LEGO Construction Activity</span>
          <span style={{ marginLeft: '1rem', color: 'var(--muted)', fontSize: '0.85rem' }}>
            Build the 3D shape that matches all 3 orthographic views.
          </span>
        </div>
        <Button variant="primary" onClick={handleFinishLegoTask} loading={isFinishing}>
          Finish LEGO Activity ✓
        </Button>
      </div>

      {/* Main 3D Studio Workstation */}
      <div className="app-shell" style={{ height: '100%', flex: 1, minHeight: 0, padding: 0 }}>
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
