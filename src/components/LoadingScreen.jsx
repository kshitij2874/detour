import { useState, useEffect } from 'react';

/** Cycling messages shown during Gemini itinerary generation. */
const MESSAGES = [
  'Plotting your adventure...',
  'Finding hidden gems...',
  'Mapping the journey...',
  'Almost ready...',
];

/**
 * LoadingScreen — full-screen animated loading state shown while Gemini
 * generates the itinerary. Cycles through travel-themed messages every 2s.
 * Meets WCAG requirements with aria-live and aria-busy.
 */
export default function LoadingScreen() {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIdx((i) => (i + 1) % MESSAGES.length);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="loading-screen"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Generating your itinerary"
    >
      <div className="loading-plane" aria-hidden="true">✈️</div>
      <p className="loading-message serif">{MESSAGES[msgIdx]}</p>
      <div className="loading-progress" aria-hidden="true">
        <div className="loading-pill" />
      </div>
    </div>
  );
}
