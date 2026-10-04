import React, { useState, useRef } from 'react';

export interface AnglePickerProps {
  value: number | null;
  onChange: (angle: number) => void;
  centerLabel: string;
  topLabel: string;
  correctAngle?: number | null;
  showCorrectAngle?: boolean;
}

export function AnglePicker({
  value,
  onChange,
  centerLabel,
  topLabel,
  correctAngle,
  showCorrectAngle = false,
}: AnglePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const calculateAngle = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;

    let theta = Math.atan2(dy, dx) * (180 / Math.PI);
    // 0 at top, 90 at right
    let adjustedAngle = Math.round((theta + 90) % 360);
    if (adjustedAngle < 0) adjustedAngle += 360;

    return adjustedAngle;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    const angle = calculateAngle(e.clientX, e.clientY);
    if (angle !== undefined) onChange(angle);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const angle = calculateAngle(e.clientX, e.clientY);
    if (angle !== undefined) onChange(angle);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture already released
    }
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

        {/* Correct Angle dotted line (for practice questions) */}
        {showCorrectAngle && correctAngle !== undefined && correctAngle !== null && (
          <div
            className="angle-picker-correct-line"
            style={{ transform: `translate(-50%, -100%) rotate(${correctAngle}deg)` }}
          ></div>
        )}

        {/* Selected Draggable Line */}
        {value !== null && value !== undefined && (
          <div
            className="angle-picker-value-line"
            style={{ transform: `translate(-50%, -100%) rotate(${value}deg)` }}
          ></div>
        )}
      </div>
      <div className="angle-picker-value-display">
        {value !== null && value !== undefined ? `${value}° selected` : 'Drag the wheel to set direction'}
      </div>
    </div>
  );
}
