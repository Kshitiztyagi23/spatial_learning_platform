import { useState, useRef } from 'react';

export default function AnglePicker({ value, onChange, centerLabel, topLabel, correctAngle, showCorrectAngle }) {
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const calculateAngle = (clientX, clientY) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;

    let theta = Math.atan2(dy, dx) * (180 / Math.PI);
    // atan2 is 0 at right, 90 at bottom.
    // We want 0 at top, 90 at right.
    let adjustedAngle = Math.round((theta + 90) % 360);
    if (adjustedAngle < 0) adjustedAngle += 360;

    return adjustedAngle;
  };

  const handlePointerDown = (e) => {
    setIsDragging(true);
    const angle = calculateAngle(e.clientX, e.clientY);
    if (angle !== undefined) onChange(angle);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const angle = calculateAngle(e.clientX, e.clientY);
    if (angle !== undefined) onChange(angle);
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div className="angle-picker-wrapper">
      <div className="angle-picker-top-label">{topLabel}</div>
      <div 
        className="angle-picker-circle" 
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="angle-picker-center-dot">
           <span className="angle-picker-center-label">{centerLabel}</span>
        </div>
        
        {/* Fixed line pointing to 0 degrees */}
        <div className="angle-picker-zero-line"></div>
        
        {/* Correct Angle dotted line */}
        {showCorrectAngle && correctAngle !== undefined && correctAngle !== null && (
          <div 
            className="angle-picker-correct-line" 
            style={{ transform: `translate(-50%, -100%) rotate(${correctAngle}deg)` }}
          ></div>
        )}

        {/* Draggable line */}
        {value !== null && value !== undefined && (
          <div 
            className="angle-picker-value-line" 
            style={{ transform: `translate(-50%, -100%) rotate(${value}deg)` }}
          ></div>
        )}
      </div>
      <div className="angle-picker-value-display">
        {value !== null && value !== undefined ? 'Angle selected' : 'Drag to draw the line'}
      </div>
    </div>
  );
}
