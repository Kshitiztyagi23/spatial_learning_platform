import { useState, useEffect, useCallback, useRef } from 'react';
import AnglePicker from './AnglePicker';

const TEST_DURATION_SECONDS = 5 * 60; // 5 minutes

const QUESTION_DATA = [
  {
    number: 1,
    imageSrc: `./questions/question.png`,
    questionText: <>1. Imagine you are standing at the <b>car</b> and facing the <b>traffic light</b>. Select the correct direction and angle at which the <b>stop sign</b> will be.</>,
    centerLabel: 'car', topLabel: 'traffic light'
  },
  {
    number: 2,
    imageSrc: `./questions/question.png`,
    questionText: <>2. Imagine you are standing at the <b>cat</b> and facing the <b>tree</b>. Select the correct direction and angle at which the <b>car</b> will be.</>,
    centerLabel: 'cat', topLabel: 'tree'
  },
  {
    number: 3,
    imageSrc: `./questions/question.png`,
    questionText: <>3. Imagine you are standing at the <b>stop sign</b> and facing the <b>cat</b>. Select the correct direction and angle at which the <b>house</b> will be.</>,
    centerLabel: 'stop sign', topLabel: 'cat'
  },
  {
    number: 4,
    imageSrc: `./questions/question.png`,
    questionText: <>4. Imagine you are standing at the <b>cat</b> and facing the <b>flower</b>. Select the correct direction and angle at which the <b>car</b> will be.</>,
    centerLabel: 'cat', topLabel: 'flower'
  },
  {
    number: 5,
    imageSrc: `./questions/question.png`,
    questionText: <>5. Imagine you are standing at the <b>stop sign</b> and facing the <b>tree</b>. Select the correct direction and angle at which the <b>traffic light</b> will be.</>,
    centerLabel: 'stop sign', topLabel: 'tree'
  },
  {
    number: 6,
    imageSrc: `./questions/question.png`,
    questionText: <>6. Imagine you are standing at the <b>stop sign</b> and facing the <b>flower</b>. Select the correct direction and angle at which the <b>car</b> will be.</>,
    centerLabel: 'stop sign', topLabel: 'flower'
  },
  {
    number: 7,
    imageSrc: `./questions/question.png`,
    questionText: <>7. Imagine you are standing at the <b>traffic light</b> and facing the <b>house</b>. Select the correct direction and angle at which the <b>flower</b> will be.</>,
    centerLabel: 'traffic light', topLabel: 'house'
  },
  {
    number: 8,
    imageSrc: `./questions/question.png`,
    questionText: <>8. Imagine you are standing at the <b>house</b> and facing the <b>flower</b>. Select the correct direction and angle at which the <b>stop sign</b> will be.</>,
    centerLabel: 'house', topLabel: 'flower'
  },
  {
    number: 9,
    imageSrc: `./questions/question.png`,
    questionText: <>9. Imagine you are standing at the <b>car</b> and facing the <b>stop sign</b>. Select the correct direction and angle at which the <b>tree</b> will be.</>,
    centerLabel: 'car', topLabel: 'stop sign'
  },
  {
    number: 10,
    imageSrc: `./questions/question.png`,
    questionText: <>10. Imagine you are standing at the <b>traffic light</b> and facing the <b>cat</b>. Select the correct direction and angle at which the <b>car</b> will be.</>,
    centerLabel: 'traffic light', topLabel: 'cat'
  },
  {
    number: 11,
    imageSrc: `./questions/question.png`,
    questionText: <>11. Imagine you are standing at the <b>tree</b> and facing the <b>flower</b>. Select the correct direction and angle at which the <b>house</b> will be.</>,
    centerLabel: 'tree', topLabel: 'flower'
  },
  {
    number: 12,
    imageSrc: `./questions/question.png`,
    questionText: <>12. Imagine you are standing at the <b>cat</b> and facing the <b>house</b>. Select the correct direction and angle at which the <b>traffic light</b> will be.</>,
    centerLabel: 'cat', topLabel: 'house'
  }
];

const Question = ({ data, selectedValue, onChange }) => {
  return (
    <div className="card">
      <h3>Question {data.number}</h3>
      <p style={{ marginBottom: '1rem', fontWeight: '500' }}>{data.questionText}</p>
      <div className="image-container">
        <img src={data.imageSrc.replace('./', import.meta.env.BASE_URL)} alt={`Question ${data.number}`} className="question-image" />
      </div>
      <AnglePicker 
        value={selectedValue !== undefined ? selectedValue : null} 
        onChange={(val) => onChange(data.number, val)} 
        centerLabel={data.centerLabel}
        topLabel={data.topLabel}
      />
    </div>
  );
};

export default function TestPage({ onComplete }) {
  const [timeLeft, setTimeLeft] = useState(TEST_DURATION_SECONDS);
  const [answers, setAnswers] = useState({});
  
  // Anti-cheat state
  const [tabSwitches, setTabSwitches] = useState(0);
  const [timeOutsideTab, setTimeOutsideTab] = useState(0); // in seconds
  const [showWarning, setShowWarning] = useState(false);
  
  const hiddenTimestamp = useRef(null);

  useEffect(() => {
    sessionStorage.setItem('testStartTime', Date.now().toString());
  }, []);

  const handleComplete = useCallback(() => {
    // Cross-reference actual time taken against manipulation of timeLeft state
    const startTimeStr = sessionStorage.getItem('testStartTime');
    const startTime = startTimeStr ? parseInt(startTimeStr, 10) : Date.now();
    const actualTimeTaken = Math.floor((Date.now() - startTime) / 1000);

    onComplete({ 
      ...answers, 
      timeTakenSeconds: actualTimeTaken,
      tabSwitches: tabSwitches,
      timeOutsideTabSeconds: timeOutsideTab
    });
  }, [answers, onComplete, tabSwitches, timeOutsideTab]);

  useEffect(() => {
    if (timeLeft <= 0) {
      handleComplete();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, handleComplete]);

  // Anti-cheat: Track visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        hiddenTimestamp.current = Date.now();
      } else {
        if (hiddenTimestamp.current) {
          const timeAwayMs = Date.now() - hiddenTimestamp.current;
          const timeAwaySec = Math.floor(timeAwayMs / 1000);
          
          setTabSwitches(prev => prev + 1);
          setTimeOutsideTab(prev => prev + timeAwaySec);
          setShowWarning(true);
          
          hiddenTimestamp.current = null;
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const handleAnswerChange = (questionNumber, value) => {
    setAnswers(prev => ({ ...prev, [`Q${questionNumber}`]: value }));
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isWarning = timeLeft <= 60; // Less than 1 minute

  return (
    <div style={{ paddingBottom: '4rem' }}>
      
      {/* Anti-cheat warning modal */}
      {showWarning && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex',
          justifyContent: 'center', alignItems: 'center'
        }}>
          <div className="card" style={{ maxWidth: '500px', textAlign: 'center', border: '2px solid var(--error-color)' }}>
            <h2 style={{ color: 'var(--error-color)' }}>Warning!</h2>
            <p style={{ marginBottom: '1.5rem' }}>
              You have navigated away from the test tab. This action has been recorded.
              Continuing to switch tabs may result in disqualification.
            </p>
            <button className="btn" onClick={() => setShowWarning(false)}>I Understand</button>
          </div>
        </div>
      )}

      <div className="timer-header">
        <div className="container" style={{ padding: 0 }}>
          <div className={`timer-display ${isWarning ? 'timer-warning' : ''}`}>
            Time Remaining: {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      <div className="container">
        {QUESTION_DATA.map(qData => (
          <Question 
            key={qData.number}
            data={qData}
            selectedValue={answers[`Q${qData.number}`]}
            onChange={handleAnswerChange}
          />
        ))}

        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            Please make sure you have answered all questions. You cannot change your answers once submitted.
          </p>
          <button className="btn" onClick={handleComplete}>
            Submit Test
          </button>
        </div>
      </div>
    </div>
  );
}
