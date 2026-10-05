import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionContext, useSessionDispatch } from '../../orchestration/SessionContext';
import { completeStage } from '../../api/sessions';
import { apiClient } from '../../api/client';
import { SCENARIOS } from './perspectiveData';
import { DirectionOption } from './types';
import './perspective.css';

export function PerspectiveTask() {
  const navigate = useNavigate();
  const { sessionId } = useSessionContext();
  const setSession = useSessionDispatch();

  // Phase: 'instructions' | 'testing'
  const [phase, setPhase] = useState<'instructions' | 'testing'>('instructions');

  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, DirectionOption>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lightbox / Pop-up Full Screen state
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxImgIdx, setLightboxImgIdx] = useState(0);

  const currentScenario = SCENARIOS[scenarioIdx];
  const currentQuestion = currentScenario.questions[questionIdx];
  const questionKey = `${currentScenario.id}_${currentQuestion.id}`;
  const selectedAnswer = answers[questionKey];

  // Reset active image when scenario changes
  useEffect(() => {
    setActiveImageIdx(0);
  }, [scenarioIdx]);

  // Open modal for a specific image index
  const openLightbox = (idx: number) => {
    setLightboxImgIdx(idx);
    setIsLightboxOpen(true);
  };

  const closeLightbox = () => {
    setIsLightboxOpen(false);
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLightboxOpen) return;
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowRight') {
        setLightboxImgIdx(prev => (prev + 1) % currentScenario.images.length);
      } else if (e.key === 'ArrowLeft') {
        setLightboxImgIdx(prev => (prev - 1 + currentScenario.images.length) % currentScenario.images.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, currentScenario.images.length]);

  const handleSelectOption = (option: DirectionOption) => {
    setAnswers(prev => ({
      ...prev,
      [questionKey]: option
    }));
  };

  const handlePrev = () => {
    if (questionIdx > 0) {
      setQuestionIdx(prev => prev - 1);
    } else if (scenarioIdx > 0) {
      const prevScenario = SCENARIOS[scenarioIdx - 1];
      setScenarioIdx(scenarioIdx - 1);
      setQuestionIdx(prevScenario.questions.length - 1);
    }
  };

  const handleNext = () => {
    if (questionIdx < currentScenario.questions.length - 1) {
      setQuestionIdx(prev => prev + 1);
    } else if (scenarioIdx < SCENARIOS.length - 1) {
      setScenarioIdx(prev => prev + 1);
      setQuestionIdx(0);
    } else {
      handleSubmitTest();
    }
  };

  const handleSubmitTest = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (sessionId) {
      try {
        // Record trial responses
        for (const scenario of SCENARIOS) {
          for (const q of scenario.questions) {
            const key = `${scenario.id}_${q.id}`;
            const userAns = answers[key];
            if (userAns) {
              await apiClient.post(`/sessions/${sessionId}/trials`, {
                task_instance_id: sessionId,
                trial_number: q.id,
                response_value: userAns,
                correct_response: q.correctAnswer,
                stimulus_id: `scenario_${scenario.id}_q_${q.questionNumber}`,
                reaction_time_ms: 1000
              }).catch(() => {});
            }
          }
        }

        // Complete spatial_perspective_taking stage
        await completeStage(sessionId, {
          stage_name: 'spatial_perspective_taking',
          payload: {
            total_scenarios: SCENARIOS.length,
            answered_count: Object.keys(answers).length,
            answers
          }
        });

        setSession({ currentStage: 'lego' });
        navigate('/lego');
      } catch (err) {
        console.error('Failed to submit perspective test:', err);
        setSession({ currentStage: 'lego' });
        navigate('/lego');
      }
    } else {
      setSession({ currentStage: 'lego' });
      navigate('/lego');
    }
  };

  // Fast-forward / Dev Skip directly to LEGO
  const handleDevSkip = async () => {
    if (sessionId) {
      try {
        await completeStage(sessionId, {
          stage_name: 'spatial_perspective_taking',
          payload: { skipped: true }
        });
      } catch (e) {
        // ignore in dev
      }
    }
    setSession({ currentStage: 'lego' });
    navigate('/lego');
  };

  const isLastQuestionOfTest = scenarioIdx === SCENARIOS.length - 1 && questionIdx === currentScenario.questions.length - 1;
  const isFirstQuestionOfTest = scenarioIdx === 0 && questionIdx === 0;

  const totalAnsweredForScenario = currentScenario.questions.filter(
    q => !!answers[`${currentScenario.id}_${q.id}`]
  ).length;

  // ----------------------------------------------------
  // INSTRUCTIONS SCREEN
  // ----------------------------------------------------
  if (phase === 'instructions') {
    return (
      <div className="perspective-container">
        <div className="instructions-card">
          <div className="instructions-hero">
            <div className="instructions-badge">Task 5 of 6</div>
            <h1 className="instructions-title">Spatial Perspective Taking Test</h1>
            <p className="instructions-subtitle">
              Test your ability to imagine 3D spatial orientations from different vantage points.
            </p>
          </div>

          <div className="instructions-grid">
            <div className="instruction-box">
              <div className="instruction-icon">👁️</div>
              <h3>6 Reference Views</h3>
              <p>
                Each scenario gives you <strong>6 distinct views</strong>:
              </p>
              <ul className="instruction-list">
                <li><strong>Main View 1 & 2:</strong> General overview and perspective of the environment.</li>
                <li><strong>A's, B's, C's & D's Perspectives:</strong> The direct viewpoint from each person's exact position.</li>
              </ul>
            </div>

            <div className="instruction-box highlight-box">
              <div className="instruction-icon">🔍</div>
              <h3>Click Any View to Enlarge</h3>
              <p>
                Images are shown prominently on desktop. <strong>Click on any image</strong> or thumbnail to pop it into a <strong>full-screen view</strong>. You can zoom in and inspect fine details, then close it or press <kbd>Esc</kbd>.
              </p>
            </div>

            <div className="instruction-box">
              <div className="instruction-icon">🧭</div>
              <h3>Answer Directions</h3>
              <p>
                Imagine you are standing at the person's location facing the given landmark. Select whether the target object is:
              </p>
              <div className="direction-chips">
                <span className="chip">Right</span>
                <span className="chip">Left</span>
                <span className="chip">Front</span>
                <span className="chip">Behind</span>
              </div>
            </div>

            <div className="instruction-box">
              <div className="instruction-icon">📝</div>
              <h3>Format & Scoring</h3>
              <p>
                There are <strong>8 Scenarios</strong> with <strong>12 questions</strong> each (1 point per question). Take your time to rotate mentally and refer to all views.
              </p>
            </div>
          </div>

          {/* Sample Preview Card */}
          <div className="sample-preview-card">
            <h4>Sample Question Preview:</h4>
            <div className="sample-preview-content">
              <em>"If C is standing at the yellow swing in the park and facing the monkey bar, what would be the location of the see-saw?"</em>
            </div>
          </div>

          {/* Action Row */}
          <div className="instructions-footer">
            <button
              type="button"
              className="btn-skip"
              onClick={handleDevSkip}
              title="Fast-forward straight to LEGO workbench"
            >
              ⚡ Dev: Skip to LEGO
            </button>

            <button
              type="button"
              className="btn-primary btn-large"
              onClick={() => setPhase('testing')}
            >
              Start Perspective Test →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // TEST QUESTIONS SCREEN
  // ----------------------------------------------------
  return (
    <div className="perspective-container">
      {/* Top Header Bar */}
      <div className="perspective-header">
        <div className="perspective-title-group">
          <h2>Spatial Perspective Taking Test</h2>
          <p className="perspective-subtitle">{currentScenario.title} — {currentScenario.context}</p>
        </div>

        <div className="perspective-meta">
          <div className="scenario-badge">
            Scenario {scenarioIdx + 1} of {SCENARIOS.length}
          </div>
          <div className="question-counter-badge">
            Question {questionIdx + 1} of {currentScenario.questions.length}
          </div>
          <button 
            type="button" 
            className="btn-skip"
            onClick={handleDevSkip}
            title="Fast-forward straight to LEGO workbench"
          >
            ⚡ Dev: Skip to LEGO
          </button>
        </div>
      </div>

      {/* Main Grid: Left = Large 6-Image Carousel, Right = 1 Question Card */}
      <div className="perspective-grid">
        {/* Left Column: Big Interactive Carousel */}
        <section className="carousel-panel" aria-label="Reference Images">
          <div className="carousel-title-row">
            <div>
              <h3>Reference Views</h3>
              <span className="carousel-hint">Click the image or any thumbnail to pop up full-screen</span>
            </div>
            <button 
              type="button"
              className="enlarge-btn"
              onClick={() => openLightbox(activeImageIdx)}
              title="Open full-screen image view"
            >
              🔍 Enlarge View
            </button>
          </div>

          {/* Large Main Viewport */}
          <div 
            className="main-image-viewport clickable"
            onClick={() => openLightbox(activeImageIdx)}
            title="Click to view full-screen"
          >
            <img 
              src={currentScenario.images[activeImageIdx]?.src} 
              alt={currentScenario.images[activeImageIdx]?.label} 
            />
            <div className="image-label-tag">
              {currentScenario.images[activeImageIdx]?.label}
            </div>
            <div className="image-hover-overlay">
              <span className="overlay-text">🔍 Click to enlarge</span>
            </div>
          </div>

          {/* 6 Named View Thumbnails */}
          <div className="thumbnails-track" role="tablist">
            {currentScenario.images.map((img, idx) => {
              const isChar = img.label.includes("'s");
              const charLetter = isChar ? img.label.split("'")[0] : null;
              return (
                <button
                  key={img.id}
                  type="button"
                  role="tab"
                  aria-selected={activeImageIdx === idx}
                  className={`thumbnail-btn ${activeImageIdx === idx ? 'active' : ''}`}
                  onClick={() => setActiveImageIdx(idx)}
                >
                  <div className="thumb-image-wrap">
                    <img src={img.src} alt={img.label} className="thumb-preview" />
                    {charLetter && (
                      <span className={`thumb-char-pill char-${charLetter}`}>
                        {charLetter}
                      </span>
                    )}
                  </div>
                  <span className="thumb-text">{img.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Right Column: Question Card */}
        <section className="question-panel" aria-label="Current Question">
          <div className="question-status-bar">
            <div>
              <strong>Question {questionIdx + 1}</strong> of {currentScenario.questions.length}
            </div>
            <div className="question-points">
              * 1 point
            </div>
          </div>

          <div className="question-text-box">
            <p className="question-prompt">{currentQuestion.text}</p>
          </div>

          {/* 4 Direction Radio Cards */}
          <div className="options-grid" role="radiogroup">
            {currentQuestion.options.map(option => {
              const isSelected = selectedAnswer === option;
              return (
                <div
                  key={option}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={0}
                  className={`option-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectOption(option)}
                  onKeyDown={e => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      handleSelectOption(option);
                    }
                  }}
                >
                  <div className="option-radio-dot">
                    {isSelected && <div className="option-radio-inner" />}
                  </div>
                  <span className="option-label">{option}</span>
                </div>
              );
            })}
          </div>

          {/* Question Quick Jump Pills */}
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.4rem' }}>
              Scenario Progress ({totalAnsweredForScenario} / {currentScenario.questions.length} answered):
            </div>
            <div className="question-pills-row">
              {currentScenario.questions.map((q, idx) => {
                const isAnswered = !!answers[`${currentScenario.id}_${q.id}`];
                const isCurrent = idx === questionIdx;
                return (
                  <button
                    key={q.id}
                    type="button"
                    className={`q-pill ${isCurrent ? 'current' : isAnswered ? 'answered' : ''}`}
                    onClick={() => setQuestionIdx(idx)}
                    title={`Go to Question ${idx + 1}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="navigation-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={handlePrev}
              disabled={isFirstQuestionOfTest}
            >
              ← Previous
            </button>

            <div className="nav-buttons-group">
              <button
                type="button"
                className="btn-primary"
                onClick={handleNext}
                disabled={isSubmitting}
              >
                {isLastQuestionOfTest ? (
                  isSubmitting ? 'Submitting...' : 'Finish & Continue to LEGO ✓'
                ) : (
                  questionIdx === currentScenario.questions.length - 1 ? (
                    'Next Scenario →'
                  ) : (
                    'Next Question →'
                  )
                )}
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* ---------------------------------------------------- */}
      {/* FULL-SCREEN POP-UP LIGHTBOX MODAL */}
      {/* ---------------------------------------------------- */}
      {isLightboxOpen && (
        <div className="lightbox-backdrop" onClick={closeLightbox}>
          <div className="lightbox-modal" onClick={e => e.stopPropagation()}>
            <div className="lightbox-header">
              <div className="lightbox-title-wrap">
                <span className="lightbox-scenario-title">Scenario {scenarioIdx + 1}</span>
                <span className="lightbox-view-title">{currentScenario.images[lightboxImgIdx]?.label}</span>
                <span className="lightbox-view-sub">({currentScenario.images[lightboxImgIdx]?.description})</span>
              </div>
              <button 
                type="button" 
                className="lightbox-close-btn" 
                onClick={closeLightbox}
                aria-label="Close"
              >
                ✕ Close (Esc)
              </button>
            </div>

            <div className="lightbox-body">
              <button
                type="button"
                className="lightbox-nav-btn prev"
                onClick={() => setLightboxImgIdx(prev => (prev - 1 + currentScenario.images.length) % currentScenario.images.length)}
                aria-label="Previous view"
              >
                ‹
              </button>

              <div className="lightbox-image-container">
                <img 
                  src={currentScenario.images[lightboxImgIdx]?.src} 
                  alt={currentScenario.images[lightboxImgIdx]?.label} 
                />
              </div>

              <button
                type="button"
                className="lightbox-nav-btn next"
                onClick={() => setLightboxImgIdx(prev => (prev + 1) % currentScenario.images.length)}
                aria-label="Next view"
              >
                ›
              </button>
            </div>

            {/* Quick Switcher at Bottom of Lightbox */}
            <div className="lightbox-footer">
              <div className="lightbox-thumbnails">
                {currentScenario.images.map((img, idx) => (
                  <button
                    key={img.id}
                    type="button"
                    className={`lightbox-thumb-btn ${lightboxImgIdx === idx ? 'active' : ''}`}
                    onClick={() => setLightboxImgIdx(idx)}
                  >
                    <span>{img.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
