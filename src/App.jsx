import { useState, useCallback, useMemo, useEffect } from 'react';
import './index.css';
import PlanForm from './components/PlanForm';
import ItineraryCard from './components/ItineraryCard';
import MapView from './components/MapView';
import DetourModal from './components/DetourModal';
import { generateItinerary, replanItinerary } from './lib/gemini';

const STORAGE_KEY = 'detour_trip';
const STORAGE_DONE_KEY = 'detour_done';

/**
 * Calculate the remaining budget from the itinerary.
 */
export function calculateBudgetRemaining(itinerary) {
  if (!itinerary || !itinerary.days) return 0;
  const totalSpent = itinerary.days.reduce((sum, day) => {
    return sum + day.activities.reduce((daySum, a) => daySum + (a.estimatedCost || 0), 0);
  }, 0);
  return (itinerary.totalBudget || 0) - totalSpent;
}

/**
 * Merge replanned itinerary with done activities preserved.
 */
export function mergeReplan(original, replanned, doneKeys) {
  const replannedKeys = new Set();
  const merged = { ...replanned };

  merged.days = merged.days.map((day, dayIdx) => {
    const originalDay = original.days[dayIdx];
    if (!originalDay) return day;

    const activities = day.activities.map((activity, actIdx) => {
      const key = `${day.day}-${actIdx}`;
      if (doneKeys.has(key) && originalDay.activities[actIdx]) {
        return { ...originalDay.activities[actIdx] };
      }
      if (
        originalDay.activities[actIdx] &&
        originalDay.activities[actIdx].name !== activity.name
      ) {
        replannedKeys.add(key);
      }
      return activity;
    });

    return { ...day, activities };
  });

  return { merged, replannedKeys };
}

/** Load itinerary from localStorage, returns null if missing/corrupt. */
function loadSavedTrip() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Load done activities set from localStorage. */
function loadSavedDone() {
  try {
    const raw = localStorage.getItem(STORAGE_DONE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function App() {
  const [itinerary, setItinerary] = useState(null);
  const [savedTrip, setSavedTrip] = useState(null); // trip detected in localStorage on load
  const [isLoading, setIsLoading] = useState(false);
  const [isReplanning, setIsReplanning] = useState(false);
  const [error, setError] = useState(null);
  const [doneActivities, setDoneActivities] = useState(new Set());
  const [replannedActivities, setReplannedActivities] = useState(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);

  // On mount, check localStorage for a saved trip
  useEffect(() => {
    const saved = loadSavedTrip();
    if (saved) setSavedTrip(saved);
  }, []);

  // Persist itinerary to localStorage whenever it changes
  useEffect(() => {
    if (itinerary) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(itinerary));
    }
  }, [itinerary]);

  // Persist done activities to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_DONE_KEY, JSON.stringify([...doneActivities]));
  }, [doneActivities]);

  // Resume saved trip
  const handleResume = useCallback(() => {
    setItinerary(savedTrip);
    setDoneActivities(loadSavedDone());
    setSavedTrip(null);
  }, [savedTrip]);

  // Clear everything and start fresh
  const handleStartNew = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_DONE_KEY);
    setSavedTrip(null);
    setItinerary(null);
    setDoneActivities(new Set());
    setReplannedActivities(new Set());
    setError(null);
  }, []);

  // Flat activity list for map
  const allActivities = useMemo(() => {
    if (!itinerary || !itinerary.days) return [];
    return itinerary.days.flatMap((day) => day.activities);
  }, [itinerary]);

  const budgetRemaining = useMemo(() => calculateBudgetRemaining(itinerary), [itinerary]);

  // Generate new plan
  const handlePlanSubmit = useCallback(async (formData) => {
    setIsLoading(true);
    setError(null);
    setItinerary(null);
    setDoneActivities(new Set());
    setReplannedActivities(new Set());
    setSavedTrip(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_DONE_KEY);

    try {
      const result = await generateItinerary(formData);
      setItinerary(result);
    } catch (err) {
      setError(err.message || 'Failed to generate itinerary. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Toggle done
  const handleToggleDone = useCallback((key) => {
    setDoneActivities((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  // Re-plan
  const handleReplan = useCallback(async (disruption) => {
    if (!itinerary) return;
    setIsReplanning(true);
    setError(null);

    try {
      const doneNames = [];
      itinerary.days.forEach((day) => {
        day.activities.forEach((activity, idx) => {
          if (doneActivities.has(`${day.day}-${idx}`)) doneNames.push(activity.name);
        });
      });

      const result = await replanItinerary({
        originalItinerary: itinerary,
        doneActivities: doneNames,
        disruption,
      });

      const { merged, replannedKeys } = mergeReplan(itinerary, result, doneActivities);
      setItinerary(merged); // triggers localStorage save via useEffect
      setReplannedActivities(replannedKeys);
      setIsModalOpen(false);
    } catch (err) {
      setError(err.message || 'Failed to re-plan. Please try again.');
    } finally {
      setIsReplanning(false);
    }
  }, [itinerary, doneActivities]);

  const budgetVariant = budgetRemaining < 0
    ? 'danger'
    : budgetRemaining < (itinerary?.totalBudget || 0) * 0.15
      ? 'warning'
      : '';

  return (
    <>
      <header className="app-header">
        <h1 className="app-logo">
          <span className="app-logo-icon">🧭</span>
          Detour
        </h1>
        <p className="app-tagline">AI-powered travel re-planning for Indian adventures</p>
      </header>

      <main>
        {/* Saved trip banner */}
        {savedTrip && !itinerary && (
          <div className="saved-trip-banner" role="region" aria-label="Saved trip detected">
            <div className="saved-trip-info">
              <span className="saved-trip-icon">📌</span>
              <span>
                You have a saved trip to <strong>{savedTrip.destination}</strong>. Continue planning?
              </span>
            </div>
            <div className="saved-trip-actions">
              <button
                className="btn-resume"
                onClick={handleResume}
                aria-label={`Resume saved trip to ${savedTrip.destination}`}
              >
                ✅ Resume Trip
              </button>
              <button
                className="btn-new"
                onClick={handleStartNew}
                aria-label="Discard saved trip and start a new one"
              >
                🗑️ Start New Trip
              </button>
            </div>
          </div>
        )}

        {/* Show form only when no active itinerary */}
        {!itinerary && !isLoading && (
          <PlanForm onSubmit={handlePlanSubmit} isLoading={isLoading} />
        )}

        {/* "Start new trip" button when itinerary is active */}
        {itinerary && !isLoading && (
          <div style={{ marginBottom: '16px', textAlign: 'right' }}>
            <button
              className="btn-new"
              onClick={handleStartNew}
              aria-label="Clear current trip and start a new one"
            >
              🗑️ Start New Trip
            </button>
          </div>
        )}

        {error && (
          <div className="error-banner" role="alert">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div
          role="status"
          aria-live="polite"
          aria-busy={isLoading || isReplanning}
        >
          {isLoading && (
            <div className="loading-container">
              <div className="spinner"></div>
              <span className="loading-text">Crafting your perfect itinerary…</span>
            </div>
          )}

          {itinerary && !isLoading && (
            <>
              <MapView activities={allActivities} />

              <section className="itinerary-section" aria-label="Your itinerary">
                <div className="itinerary-header">
                  <h2 className="itinerary-title">
                    📍 {itinerary.destination} — {itinerary.days?.length || 0} Day{(itinerary.days?.length || 0) !== 1 ? 's' : ''}
                  </h2>
                  <span className={`budget-badge ${budgetVariant}`}>
                    💰 ₹{budgetRemaining.toLocaleString('en-IN')} remaining
                  </span>
                </div>

                {itinerary.days?.map((day) => (
                  <ItineraryCard
                    key={day.day}
                    dayData={day}
                    doneActivities={doneActivities}
                    onToggleDone={handleToggleDone}
                    replannedActivities={replannedActivities}
                  />
                ))}
              </section>
            </>
          )}

          {!itinerary && !isLoading && !error && !savedTrip && (
            <div className="empty-state">
              <div className="empty-state-icon">🌏</div>
              <p className="empty-state-text">
                Fill in your trip details above and let AI plan your adventure!
              </p>
            </div>
          )}
        </div>
      </main>

      {itinerary && !isLoading && (
        <button
          className="detour-fab"
          onClick={() => setIsModalOpen(true)}
          aria-label="Report a disruption to re-plan your trip"
        >
          ⚡ Something Changed
        </button>
      )}

      <DetourModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleReplan}
        isLoading={isReplanning}
      />

      <nav aria-label="Footer" style={{ textAlign: 'center', padding: '32px 0 16px', color: '#94A3B8', fontSize: '0.8rem' }}>
        Built with Gemini AI & Google Maps · © 2026 Detour
      </nav>
    </>
  );
}

export default App;
