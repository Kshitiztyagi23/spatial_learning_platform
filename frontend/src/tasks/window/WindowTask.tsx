import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../shared/Button';
import { useSessionContext, useSessionDispatch } from '../../orchestration/SessionContext';
import { completeStage, getNextStage } from '../../api/sessions';
import { STAGE_ROUTES, type Stage } from '../../orchestration/stages';
import { apiClient } from '../../api/client';
import { WINDOW_INTROS, WINDOW_OPTIONS, WINDOW_QUESTIONS, type WindowOption, type WindowQuestion, type WindowSet } from './windowData';
import './window.css';

function shuffled<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function formatClock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** The four option pictures sit side by side in the bottom part of each image. */
function OptionImage({ question, selected, onSelect }: { question: WindowQuestion; selected: WindowOption | null; onSelect: (o: WindowOption) => void }) {
  return (
    <div className="window-image-wrap">
      <img src={question.image} alt={`Question: ${question.prompt} Options A to D are shown below the shape.`} className="window-image" draggable={false} />
      <div className="window-option-hitboxes">
        {WINDOW_OPTIONS.map(option => (
          <button
            key={option}
            type="button"
            className={`window-option-hitbox ${selected === option ? 'selected' : ''}`}
            onClick={() => onSelect(option)}
            aria-label={`Option ${option}`}
            aria-pressed={selected === option}
          />
        ))}
      </div>
    </div>
  );
}

export function WindowTask() {
  const navigate = useNavigate();
  const { sessionId } = useSessionContext();
  const setSession = useSessionDispatch();

  const [questions, setQuestions] = useState<WindowQuestion[]>(WINDOW_QUESTIONS);
  const [timeLimit, setTimeLimit] = useState(0);
  const [phase, setPhase] = useState<'loading' | 'instructions' | 'testing' | 'submitting'>('loading');
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<WindowOption | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const shownAt = useRef(Date.now());
  const finishing = useRef(false);
  const answered = useRef(0);

  // Question selection, order and time limit come from the study protocol
  useEffect(() => {
    if (!sessionId) {
      setPhase('instructions');
      return;
    }
    apiClient.get(`/sessions/${sessionId}/task-config/window_test`)
      .then(res => {
        const cfg = res.data;
        if (Array.isArray(cfg.selected_questions)) {
          const wanted = new Set<string>(cfg.selected_questions);
          const chosen = WINDOW_QUESTIONS.filter(q => wanted.has(q.id));
          if (chosen.length > 0) setQuestions(cfg.shuffle ? shuffled(chosen) : chosen);
        }
        if (typeof cfg.time_limit_seconds === 'number' && cfg.time_limit_seconds > 0) setTimeLimit(cfg.time_limit_seconds);
      })
      .catch(err => console.warn('Using the full window test:', err))
      .finally(() => setPhase('instructions'));
  }, [sessionId]);

  const setsInUse = useMemo(() => {
    const present = new Set(questions.map(q => q.set));
    return (['easy', 'hard'] as WindowSet[]).filter(s => present.has(s));
  }, [questions]);

  const finish = useCallback(async (timedOut: boolean) => {
    if (finishing.current) return;
    finishing.current = true;
    setPhase('submitting');
    if (!sessionId) {
      navigate('/done');
      return;
    }
    try {
      await completeStage(sessionId, {
        stage_name: 'window_test',
        payload: { answered: answered.current, total: questions.length, timed_out: timedOut },
      });
      const next = await getNextStage(sessionId);
      setSession({ currentStage: next.stage_name });
      navigate(STAGE_ROUTES[next.stage_name as Stage] || '/done');
    } catch (err) {
      console.error('Failed to finish the window test:', err);
      finishing.current = false;
      setPhase('testing');
    }
  }, [sessionId, questions.length, setSession, navigate]);

  // Optional time limit from the protocol
  useEffect(() => {
    if (phase !== 'testing' || timeLimit <= 0) return;
    const deadline = Date.now() + timeLimit * 1000;
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setTimeLeft(left);
      if (left === 0) finish(true);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
    // The deadline is fixed when the test starts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase === 'testing', timeLimit]);

  useEffect(() => {
    shownAt.current = Date.now();
  }, [index, phase]);

  const question = questions[index];

  const handleNext = async () => {
    if (!question || !selected) return;
    const reactionTime = Date.now() - shownAt.current;
    if (sessionId) {
      // Saved one at a time so a timeout doesn't lose earlier answers
      await apiClient.post(`/sessions/${sessionId}/trials`, {
        task_type: 'window_test',
        trial_number: index + 1,
        stimulus_id: question.id,
        response_value: selected,
        reaction_time_ms: reactionTime,
      }).catch(err => console.warn('Window trial not recorded:', err));
    }
    answered.current += 1;
    setSelected(null);
    if (index + 1 < questions.length) setIndex(index + 1);
    else finish(false);
  };

  if (phase === 'loading') {
    return <div className="window-container"><p className="window-muted">Loading…</p></div>;
  }

  if (phase === 'instructions') {
    return (
      <div className="window-container">
        <h2>Window Test</h2>
        <p className="window-muted">
          {questions.length} questions{timeLimit > 0 ? `, ${formatClock(timeLimit)} minutes` : ''}. Pick one answer for each.
        </p>
        {setsInUse.map(set => {
          const intro = WINDOW_INTROS[set];
          return (
            <section key={set} className="window-intro">
              <h3>{intro.title}</h3>
              {intro.text.map(t => <p key={t}>{t}</p>)}
              <ul>{intro.tips.map(t => <li key={t}>{t}</li>)}</ul>
              <img src={intro.example} alt={`Example for ${intro.title}`} className="window-image window-example" />
              <p><b>In this example, the answer is {intro.exampleAnswer}.</b> It has the same black windows in the same places, just turned.</p>
            </section>
          );
        })}
        <div className="window-actions">
          <Button variant="primary" onClick={() => setPhase('testing')}>Start the test</Button>
        </div>
      </div>
    );
  }

  if (!question || phase === 'submitting') {
    return <div className="window-container"><p className="window-muted">Saving your answers…</p></div>;
  }

  return (
    <div className="window-container">
      <div className="window-header">
        <span className="window-counter">Question {index + 1} of {questions.length}</span>
        {timeLeft !== null && (
          <span className={`window-timer ${timeLeft <= 30 ? 'low' : ''}`} role="timer" aria-label="Time left">
            Time left {formatClock(timeLeft)}
          </span>
        )}
      </div>
      <p className="window-prompt">{question.prompt}</p>
      <OptionImage question={question} selected={selected} onSelect={setSelected} />
      <div className="window-option-buttons" role="radiogroup" aria-label="Your answer">
        {WINDOW_OPTIONS.map(option => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected === option}
            className={`window-option-button ${selected === option ? 'selected' : ''}`}
            onClick={() => setSelected(option)}
          >
            {option}
          </button>
        ))}
      </div>
      <div className="window-actions">
        <Button variant="primary" onClick={handleNext} disabled={!selected}>
          {index + 1 < questions.length ? 'Next question' : 'Finish'}
        </Button>
      </div>
    </div>
  );
}
