import { useState, useEffect } from 'react';
import './index.css';
import IntroPage from './components/IntroPage';
import TestPage from './components/TestPage';
import EndPage from './components/EndPage';

function App() {
  const [currentPage, setCurrentPage] = useState('intro'); // 'intro', 'test', 'end'
  const [participantData, setParticipantData] = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [sessionId] = useState(() => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)));

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  const handleStartTest = (data) => {
    setParticipantData(data);
    setCurrentPage('test');
  };

  const handleTestComplete = (results) => {
    setTestResults(results);
    setCurrentPage('end');
    
    // In a real scenario, this is where you'd send data to Google Sheets
    submitToGoogleSheets(participantData, results);
  };

  const submitToGoogleSheets = async (user, answers) => {
    const SCRIPT_URL = import.meta.env.VITE_SCRIPT_URL;

    if (!SCRIPT_URL) {
      console.error('VITE_SCRIPT_URL is missing in .env');
      return;
    }

    try {
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          ...user,
          answers,
          sessionId,
          timestamp: new Date().toISOString()
        })
      });
      
      console.log('Submitted successfully', response);
    } catch (error) {
      console.error('Error submitting to Google Sheets:', error);
    }
  };

  return (
    <div className="App">
      {currentPage === 'intro' && <IntroPage onStart={handleStartTest} />}
      {currentPage === 'test' && <TestPage onComplete={handleTestComplete} />}
      {currentPage === 'end' && <EndPage />}
    </div>
  );
}

export default App;
