import { useState } from 'react';
import AnglePicker from './AnglePicker';

const ExampleQuestion = ({ questionNumber, imageSrc, questionText, correctAngle, explanation, centerLabel, topLabel }) => {
  const [selectedAngle, setSelectedAngle] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);

  // We will consider it correct if it is within 10 degrees.
  const isCorrect = selectedAngle !== null && Math.abs(selectedAngle - correctAngle) <= 10;

  const handleCheck = () => {
    setShowExplanation(true);
  };

  return (
    <div className="card">
      <h3>Example Question {questionNumber}</h3>
      <p style={{ marginBottom: '1rem', fontWeight: '500' }}>{questionText}</p>
      <img src={imageSrc} alt={`Example ${questionNumber}`} className="question-image" />
      
      <AnglePicker 
        value={selectedAngle}
        onChange={(val) => {
          setSelectedAngle(val);
          setShowExplanation(false); // Hide explanation if they start moving again
        }}
        centerLabel={centerLabel}
        topLabel={topLabel}
        correctAngle={correctAngle}
        showCorrectAngle={showExplanation}
      />

      <div style={{ textAlign: 'center', marginTop: '1rem' }}>
        <button 
          className="btn" 
          onClick={handleCheck}
          disabled={selectedAngle === null}
        >
          Check Answer
        </button>
      </div>

      {showExplanation && (
        <div className={`explanation-box ${isCorrect ? 'success' : 'error'}`}>
          <div style={{ marginBottom: '0.5rem', fontWeight: 'bold', color: isCorrect ? 'var(--success-color)' : 'var(--error-color)' }}>
            {isCorrect ? 'Correct!' : 'Incorrect. See the dotted line for the correct direction.'}
          </div>
        </div>
      )}
    </div>
  );
};

export default function IntroPage({ onStart }) {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: '',
    rollNo: '',
    grade: '',
    section: ''
  });

  const isFormValid = formData.name.trim() !== '' && 
                      formData.age.trim() !== '' &&
                      formData.gender.trim() !== '' &&
                      formData.rollNo.trim() !== '' && 
                      formData.grade.trim() !== '' && 
                      formData.section.trim() !== '';

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'grade') {
      setFormData({ ...formData, grade: value, section: '' });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isFormValid) {
      onStart(formData);
    }
  };

  const grade5Sections = ["BG G5 A11C", "BG G5 A11B", "BR G5 A31A", "BG G5 A11A"];
  const grade8Sections = ["G8-A11A", "G8-A11B", "G8-A11D", "G8-A11C"];

  return (
    <div className="container">
      <div className="card">
        <h1>Perspective-Taking Spatial Orientation Test</h1>
        <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
          Welcome to the Spatial Orientation Test. Before you begin the timed section, please read the instructions below, fill in your details, and try the two example questions.
        </p>
        
        <h2>Instructions</h2>
        <ul style={{ paddingLeft: '1.5rem', marginBottom: '2rem', color: 'var(--text-secondary)' }}>
          <li>This test consists of 12 questions.</li>
          <li>You will have exactly 5 minutes to complete the test.</li>
          <li>For each question, imagine you are standing at the first object facing the second object. You must identify the angle/direction of the third object.</li>
          <li>Use the circular slider to point the line toward the correct object. 0° is straight ahead.</li>
          <li>The test will automatically submit when the timer runs out.</li>
          <li>DO NOT leave the test page or switch tabs during the test. You will be penalized for any violations.</li>
        </ul>

        <h2>Participant Details</h2>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Full Name</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} required />
          </div>
          <div className="input-group">
            <label>Age</label>
            <input type="number" name="age" value={formData.age} onChange={handleChange} style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '1rem' }} required />
          </div>
          <div className="input-group">
            <label>Gender</label>
            <select name="gender" value={formData.gender} onChange={handleChange} style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '1rem' }} required>
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>
          <div className="input-group">
            <label>Roll No.</label>
            <input type="text" name="rollNo" value={formData.rollNo} onChange={handleChange} required />
          </div>
          <div className="input-group">
            <label>Standard / Grade</label>
            <select name="grade" value={formData.grade} onChange={handleChange} style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '1rem' }} required>
              <option value="">Select Grade</option>
              <option value="Grade 5">Grade 5</option>
              <option value="Grade 8">Grade 8</option>
            </select>
          </div>
          <div className="input-group">
            <label>Section</label>
            <select name="section" value={formData.section} onChange={handleChange} style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '1rem' }} required disabled={!formData.grade}>
              <option value="">Select Section</option>
              {formData.grade === "Grade 5" && grade5Sections.map(s => <option key={s} value={s}>{s}</option>)}
              {formData.grade === "Grade 8" && grade8Sections.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </form>
      </div>

      <ExampleQuestion 
        questionNumber={1}
        imageSrc="./questions/question.png"
        questionText={<>Imagine you are standing at the <b>cat</b> and facing the <b>house</b> (this is 0°). Now measure clockwise to find the <b>stop sign</b>.</>}
        centerLabel="cat"
        topLabel="house"
        correctAngle={60}
        explanation="Since you are facing the house, the stop sign is to your front-right, making it a 60-degree angle."
      />

      <ExampleQuestion 
        questionNumber={2}
        imageSrc="./questions/question.png"
        questionText={<>Imagine you are standing at the <b>cat</b> and facing the <b>house</b> (this is 0°). Now measure clockwise to find the <b>flower</b>.</>}
        centerLabel="cat"
        topLabel="house"
        correctAngle={300}
        explanation="Facing the house, the flower is to your left. Measuring clockwise, 360 - 60 = 300 degrees."
      />

      <div className="card" style={{ textAlign: 'center' }}>
        <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
          Once you have completed the examples and filled in your details, you can begin the test. The 5-minute timer will start immediately on the next page.
        </p>
        <button 
          className="btn" 
          onClick={handleSubmit} 
          disabled={!isFormValid}
        >
          {isFormValid ? 'Start Timed Test' : 'Fill all details to start'}
        </button>
      </div>
    </div>
  );
}
