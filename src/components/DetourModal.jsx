import { useState } from 'react';
import { sanitizeInput } from '../lib/gemini';

/**
 * DetourModal — disruption input modal for re-planning.
 * @param {object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {function} props.onClose - Called when modal is dismissed
 * @param {function} props.onSubmit - Called with disruption text
 * @param {boolean} props.isLoading - Disables input while re-planning
 */
export default function DetourModal({ isOpen, onClose, onSubmit, isLoading }) {
  const [disruption, setDisruption] = useState('');

  if (!isOpen) return null;

  function handleSubmit(e) {
    e.preventDefault();
    const cleaned = sanitizeInput(disruption);
    if (!cleaned) return;
    onSubmit(cleaned);
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label="Report a disruption"
    >
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">⚡ What happened?</h2>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close disruption modal"
            disabled={isLoading}
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <textarea
            className="modal-textarea"
            placeholder="e.g. It's raining heavily, missed the 2pm bus, overspent by ₹1500 on lunch..."
            aria-label="Describe what went wrong"
            aria-describedby="disruption-hint"
            value={disruption}
            onChange={(e) => setDisruption(e.target.value)}
            disabled={isLoading}
            autoFocus
          />
          <p id="disruption-hint" className="modal-hint">
            Describe the disruption and we'll re-plan your remaining activities accordingly.
          </p>
          <button
            type="submit"
            className="modal-submit"
            aria-label="Re-plan itinerary"
            disabled={isLoading || !disruption.trim()}
          >
            {isLoading ? (
              <>
                <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2, display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }}></span>
                Re-planning…
              </>
            ) : (
              '🔄 Re-plan My Trip'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
