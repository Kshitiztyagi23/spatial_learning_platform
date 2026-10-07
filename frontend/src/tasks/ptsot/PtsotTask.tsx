import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnglePicker } from './AnglePicker';
import { Button } from '../../shared/Button';
import { useSessionContext, useSessionDispatch } from '../../orchestration/SessionContext';
import { completeStage, getNextStage } from '../../api/sessions';
import { STAGE_ROUTES, Stage } from '../../orchestration/stages';
import { apiClient } from '../../api/client';
import './ptsot.css';

const TEST_DURATION_SECONDS = 5 * 60; // 5 minutes

export interface QuestionData {
  number: number;
  imageSrc: string;
  questionText: React.ReactNode;
  centerLabel: string;
  topLabel: string;
  correctAngle: number;
}

const QUESTION_DATA: QuestionData[] = [
  {
    number: 1,
    imageSrc: '/questions/question.png',
    questionText: <>1. Imagine you are standing at the <b>car</b> and facing the <b>traffic light</b>. Select the correct direction and angle at which the <b>stop sign</b> will be.</>,
    centerLabel: 'car', topLabel: 'traffic light',
    correctAngle: 123
  },
  {
    number: 2,
    imageSrc: '/questions/question.png',
    questionText: <>2. Imagine you are standing at the <b>cat</b> and facing the <b>tree</b>. Select the correct direction and angle at which the <b>car</b> will be.</>,
    centerLabel: 'cat', topLabel: 'tree',
    correctAngle: 237
  },
  {
    number: 3,
    imageSrc: '/questions/question.png',
    questionText: <>3. Imagine you are standing at the <b>stop sign</b> and facing the <b>cat</b>. Select the correct direction and angle at which the <b>house</b> will be.</>,
    centerLabel: 'stop sign', topLabel: 'cat',
    correctAngle: 83
  },
  {
    number: 4,
    imageSrc: '/questions/question.png',
    questionText: <>4. Imagine you are standing at the <b>cat</b> and facing the <b>flower</b>. Select the correct direction and angle at which the <b>car</b> will be.</>,
    centerLabel: 'cat', topLabel: 'flower',
    correctAngle: 156
  },
  {
    number: 5,
    imageSrc: '/questions/question.png',
    questionText: <>5. Imagine you are standing at the <b>stop sign</b> and facing the <b>tree</b>. Select the correct direction and angle at which the <b>traffic light</b> will be.</>,
    centerLabel: 'stop sign', topLabel: 'tree',
    correctAngle: 319
  },
  {
    number: 6,
    imageSrc: '/questions/question.png',
    questionText: <>6. Imagine you are standing at the <b>stop sign</b> and facing the <b>flower</b>. Select the correct direction and angle at which the <b>car</b> will be.</>,
    centerLabel: 'stop sign', topLabel: 'flower',
    correctAngle: 235
  },
  {
    number: 7,
    imageSrc: '/questions/question.png',
    questionText: <>7. Imagine you are standing at the <b>traffic light</b> and facing the <b>house</b>. Select the correct direction and angle at which the <b>flower</b> will be.</>,
    centerLabel: 'traffic light', topLabel: 'house',
    correctAngle: 333
  },
  {
    number: 8,
    imageSrc: '/questions/question.png',
    questionText: <>8. Imagine you are standing at the <b>house</b> and facing the <b>flower</b>. Select the correct direction and angle at which the <b>stop sign</b> will be.</>,
    centerLabel: 'house', topLabel: 'flower',
    correctAngle: 260
  },
  {
    number: 9,
    imageSrc: '/questions/question.png',
    questionText: <>9. Imagine you are standing at the <b>car</b> and facing the <b>stop sign</b>. Select the correct direction and angle at which the <b>tree</b> will be.</>,
    centerLabel: 'car', topLabel: 'stop sign',
    correctAngle: 48
  },
  {
    number: 10,
    imageSrc: '/questions/question.png',
    questionText: <>10. Imagine you are standing at the <b>traffic light</b> and facing the <b>cat</b>. Select the correct direction and angle at which the <b>car</b> will be.</>,
    centerLabel: 'traffic light', topLabel: 'cat',
    correctAngle: 66
  },
  {
    number: 11,
    imageSrc: '/questions/question.png',
    questionText: <>11. Imagine you are standing at the <b>tree</b> and facing the <b>flower</b>. Select the correct direction and angle at which the <b>house</b> will be.</>,
    centerLabel: 'tree', topLabel: 'flower',
    correctAngle: 279
  },
  {
    number: 12,
    imageSrc: '/questions/question.png',
    questionText: <>12. Imagine you are standing at the <b>cat</b> and facing the <b>house</b>. Select the correct direction and angle at which the <b>traffic light</b> will be.</>,
    centerLabel: 'cat', topLabel: 'house',
    correctAngle: 65
  }
];

export function PtsotTask() {
  const navigate = useNavigate();
  const { sessionId } = useSessionContext();
  const setSession = useSessionDispatch();

  // Phase: 'instructions' | 'practice' | 'testing' | 'submitting'
  const [phase, setPhase] = useState<'instructions' | 'practice' | 'testing' | 'submitting'>('instructions');
  
  // Practice state
  const [practice1Angle, setPractice1Angle] = useState<number | null>(null);
  const [practice2Angle, setPractice2Angle] = useState<number | null>(null);
  const [showPractice1Exp, setShowPractice1Exp] = useState(false);
  const [showPractice2Exp, setShowPractice2Exp] = useState(false);

  // Dynamic question pool state
  const [questions, setQuestions] = useState<QuestionData[]>(QUESTION_DATA);

  // Test state
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [reactionTimes, setReactionTimes] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(TEST_DURATION_SECONDS);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const questionStartTime = useRef(Date.now());
  const timerRef = useRef<any>(null);

  // Fetch task configuration (active questions & duration) from session protocol
  useEffect(() => {
    if (!sessionId) return;
    apiClient.get(`/sessions/${sessionId}/task-config/ptsot`)
      .then(res => {
        const cfg = res.data;
        if (cfg.selected_questions && Array.isArray(cfg.selected_questions)) {
          const filtered = QUESTION_DATA.filter(q => cfg.selected_questions.includes(q.number));
          if (filtered.length > 0) {
            setQuestions(filtered);
          }
        }
        if (cfg.time_limit_seconds && typeof cfg.time_limit_seconds === 'number') {
          setTimeLeft(cfg.time_limit_seconds);
        }
      })
      .catch(err => {
        console.warn('Using default PTSOT config:', err);
      });
  }, [sessionId]);

  // Anti-cheat tab switch detection
  useEffect(() => {
    if (phase !== 'testing') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount(prev => prev + 1);
        setShowWarning(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [phase]);

  // Submit test results to backend and advance stage
  const submitTest = useCallback(async (finalAnswers = answers, finalReactionTimes = reactionTimes) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setPhase('submitting');
    if (timerRef.current) clearInterval(timerRef.current);

    if (sessionId) {
      try {
        // Send trial records to backend for active questions
        for (const q of questions) {
          const ans = finalAnswers[q.number];
          const rt = finalReactionTimes[q.number] || 0;
          if (ans !== undefined) {
            await apiClient.post(`/sessions/${sessionId}/trials`, {
              task_type: 'ptsot',
              trial_number: q.number,
              stimulus_id: `ptsot_q${q.number}`,
              response_value: String(ans),
              correct_response: String(q.correctAngle),
              reaction_time_ms: rt
            });
          }
        }

        // Complete PTSOT stage
        await completeStage(sessionId, {
          stage_name: 'ptsot',
          payload: {
            tab_switches: tabSwitchCount,
            answers: finalAnswers,
            time_remaining: timeLeft,
            completed_all: Object.keys(finalAnswers).length === questions.length
          }
        });

        // Resolve next stage dynamically from protocol
        const next = await getNextStage(sessionId);
        setSession({ currentStage: next.stage_name });
        const route = STAGE_ROUTES[next.stage_name as Stage] || '/perspective';
        navigate(route);
      } catch (err) {
        console.error('Failed to submit PTSOT trials:', err);
        const route = STAGE_ROUTES['spatial_perspective_taking'] || '/perspective';
        navigate(route);
      }
    } else {
      navigate('/perspective');
    }
  }, [answers, reactionTimes, isSubmitting, sessionId, tabSwitchCount, timeLeft, questions, setSession, navigate]);

  // 5-minute countdown timer
  useEffect(() => {
    if (phase !== 'testing') return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          submitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, submitTest]);

  const handleAngleChange = (qNum: number, angle: number) => {
    const rt = Date.now() - questionStartTime.current;
    setAnswers(prev => ({ ...prev, [qNum]: angle }));
    setReactionTimes(prev => ({ ...prev, [qNum]: rt }));
  };

  const handleNext = () => {
    if (currentIdx < QUESTION_DATA.length - 1) {
      setCurrentIdx(prev => prev + 1);
      questionStartTime.current = Date.now();
    } else {
      submitTest();
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(prev => prev - 1);
      questionStartTime.current = Date.now();
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // 1. Instructions Screen
  if (phase === 'instructions') {
    return (
      <div className="card ptsot-card">
        <h2>Perspective-Taking Spatial Orientation Test (PTSOT)</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          In this task, you will see a picture with various objects. For each question, imagine you are standing at one object, facing a second object, and you need to determine the direction to a third object.
        </p>

        <div className="ptsot-instruction-box">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Instructions:</h3>
          <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.6, color: 'var(--ink)' }}>
            <li>The test has <b>12 questions</b> and a strict <b>5-minute time limit</b>.</li>
            <li>Use the interactive dial to draw a line pointing toward the third object.</li>
            <li>Straight ahead (0°) represents the object you are facing.</li>
            <li><b>Do not switch tabs or leave this window</b> during the test. Violations will be recorded.</li>
          </ul>
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="primary" onClick={() => setPhase('practice')}>
            Next: Try Example Questions
          </Button>
        </div>
      </div>
    );
  }

  // 2. Practice Questions Screen
  if (phase === 'practice') {
    const isP1Correct = practice1Angle !== null && Math.abs(practice1Angle - 60) <= 12;
    const isP2Correct = practice2Angle !== null && Math.abs(practice2Angle - 300) <= 12;

    return (
      <div className="card ptsot-card">
        <h2>Practice Examples</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
          Try these 2 example questions to get comfortable with the dial before starting the timed test.
        </p>

        {/* Practice 1 */}
        <div className="ptsot-example-item">
          <h4>Example 1</h4>
          <p style={{ marginBottom: '1rem' }}>
            Imagine you are standing at the <b>cat</b> facing the <b>house</b> (0°). Where is the <b>stop sign</b>?
          </p>
          <img src="/questions/question.png" alt="Map Layout" className="ptsot-question-img" />
          <AnglePicker
            value={practice1Angle}
            onChange={(ang) => {
              setPractice1Angle(ang);
              setShowPractice1Exp(false);
            }}
            centerLabel="cat"
            topLabel="house"
            correctAngle={60}
            showCorrectAngle={showPractice1Exp}
          />
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <Button
              variant="secondary"
              disabled={practice1Angle === null}
              onClick={() => setShowPractice1Exp(true)}
            >
              Check Answer
            </Button>
          </div>
          {showPractice1Exp && (
            <div className={`ptsot-feedback-banner ${isP1Correct ? 'correct' : 'incorrect'}`}>
              {isP1Correct ? '✓ Correct! It is at approximately 60°.' : 'Notice the dotted line showing the correct 60° angle.'}
            </div>
          )}
        </div>

        <hr style={{ margin: '2.5rem 0', borderColor: 'var(--border)' }} />

        {/* Practice 2 */}
        <div className="ptsot-example-item">
          <h4>Example 2</h4>
          <p style={{ marginBottom: '1rem' }}>
            Imagine you are standing at the <b>cat</b> facing the <b>house</b> (0°). Where is the <b>flower</b>?
          </p>
          <img src="/questions/question.png" alt="Map Layout" className="ptsot-question-img" />
          <AnglePicker
            value={practice2Angle}
            onChange={(ang) => {
              setPractice2Angle(ang);
              setShowPractice2Exp(false);
            }}
            centerLabel="cat"
            topLabel="house"
            correctAngle={300}
            showCorrectAngle={showPractice2Exp}
          />
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <Button
              variant="secondary"
              disabled={practice2Angle === null}
              onClick={() => setShowPractice2Exp(true)}
            >
              Check Answer
            </Button>
          </div>
          {showPractice2Exp && (
            <div className={`ptsot-feedback-banner ${isP2Correct ? 'correct' : 'incorrect'}`}>
              {isP2Correct ? '✓ Correct! It is at approximately 300°.' : 'Notice the dotted line showing the correct 300° angle.'}
            </div>
          )}
        </div>

        <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
          <p style={{ marginBottom: '1rem', color: 'var(--muted)' }}>
            Once you click Start, the 5-minute timer begins immediately.
          </p>
          <Button
            variant="primary"
            onClick={() => {
              questionStartTime.current = Date.now();
              setPhase('testing');
            }}
          >
            Start Timed Test (5 Minutes)
          </Button>
        </div>
      </div>
    );
  }

  // 3. Submitting Screen
  if (phase === 'submitting') {
    return (
      <div className="card ptsot-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <h2>Saving Test Responses...</h2>
        <p style={{ color: 'var(--muted)', marginTop: '1rem' }}>
          Please wait while your perspective-taking results are securely saved.
        </p>
      </div>
    );
  }

  // 4. Main Timed Test
  const currentQ = questions[currentIdx] || questions[0];
  const currentAnswer = currentQ ? answers[currentQ.number] : undefined;

  return (
    <div className="ptsot-container">
      {/* Sticky Timer Header */}
      <div className="ptsot-timer-bar">
        <div className="ptsot-timer-info">
          <span>Question <b>{currentIdx + 1}</b> of {questions.length}</span>
        </div>
        <div className={`ptsot-countdown ${timeLeft < 60 ? 'urgent' : ''}`}>
          ⏱ {formatTime(timeLeft)}
        </div>
      </div>

      {showWarning && (
        <div className="ptsot-warning-banner">
          ⚠️ Tab switch detected ({tabSwitchCount}). Please stay on this tab during the test.
          <button onClick={() => setShowWarning(false)} style={{ marginLeft: '1rem', cursor: 'pointer' }}>Dismiss</button>
        </div>
      )}

      {/* Question Card */}
      <div className="card ptsot-card">
        <p className="ptsot-question-prompt">
          {currentQ.questionText}
        </p>

        <div style={{ textAlign: 'center' }}>
          <img src={currentQ.imageSrc} alt="PTSOT Layout" className="ptsot-question-img" />
        </div>

        <AnglePicker
          value={currentAnswer !== undefined ? currentAnswer : null}
          onChange={(angle) => handleAngleChange(currentQ.number, angle)}
          centerLabel={currentQ.centerLabel}
          topLabel={currentQ.topLabel}
        />

        <div className="ptsot-nav-row">
          <Button
            variant="secondary"
            disabled={currentIdx === 0}
            onClick={handlePrev}
          >
            ← Previous
          </Button>

          <Button
            variant="primary"
            disabled={currentAnswer === undefined}
            onClick={handleNext}
          >
            {currentIdx === questions.length - 1 ? 'Submit Test ✓' : 'Next Question →'}
          </Button>
        </div>
      </div>
    </div>
  );
}
