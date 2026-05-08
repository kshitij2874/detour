import { useState, useCallback, useMemo } from 'react';
import './index.css';
import PlanForm from './components/PlanForm';
import ItineraryCard from './components/ItineraryCard';
import MapView from './components/MapView';
import DetourModal from './components/DetourModal';
import { generateItinerary, replanItinerary } from './lib/gemini';

/**
 * Calculate the remaining budget from the itinerary.
 * @param {object} itinerary - Full itinerary JSON
 * @returns {number} Remaining budget
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
 * @param {object} original - Original itinerary
 * @param {object} replanned - New itinerary from Gemini
 * @param {Set<string>} doneKeys - "day-index" keys of done activities
 * @returns {{ merged: object, replannedKeys: Set<string> }}
 */
export function mergeReplan(original, replanned, doneKeys) {
  const replannedKeys = new Set();
  const merged = { ...replanned };

  merged.days = merged.days.map((day, dayIdx) => {
    const originalDay = original.days[dayIdx];
    if (!originalDay) return day;

    const activities = day.activities.map((activity, actIdx) => {
      const key = `${day.day}-${actIdx}`;
      // If this activity was marked as done in the original, preserve it
      if (doneKeys.has(key) && originalDay.activities[actIdx]) {
        return { ...originalDay.activities[actIdx] };
      }
      // Check if this activity differs from original
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

function App() {
  const [itinerary, setItinerary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReplanning, setIsReplanning] = useState(false);
  const [error, setError] = useState(null);
  const [doneActivities, setDoneActivities] = useState(new Set());
  const [replannedActivities, setReplannedActivities] = useState(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Flatten all activities for the map
  const allActivities = useMemo(() => {
    if (!itinerary || !itinerary.days) return [];
    return itinerary.days.flatMap((day) => day.activities);
  }, [itinerary]);

  // Budget remaining
  const budgetRemaining = useMemo(() => {
    return calculateBudgetRemaining(itinerary);
  }, [itinerary]);

  // Handle plan submission
  const handlePlanSubmit = useCallback(async (formData) => {
    setIsLoading(true);
    setError(null);
    setItinerary(null);
    setDoneActivities(new Set());
    setReplannedActivities(new Set());

    try {
      const result = await generateItinerary(formData);
      setItinerary(result);
    } catch (err) {
      setError(err.message || 'Failed to generate itinerary. Please try again.');
      console.error('Plan error:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Toggle done
  const handleToggleDone = useCallback((key) => {
    setDoneActivities((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // Handle replan
  const handleReplan = useCallback(async (disruption) => {
    if (!itinerary) return;
    setIsReplanning(true);
    setError(null);

    try {
      // Collect names of done activities
      const doneNames = [];
      itinerary.days.forEach((day) => {
        day.activities.forEach((activity, idx) => {
          if (doneActivities.has(`${day.day}-${idx}`)) {
            doneNames.push(activity.name);
          }
        });
      });

      const result = await replanItinerary({
        originalItinerary: itinerary,
        doneActivities: doneNames,
        disruption,
      });

      const { merged, replannedKeys } = mergeReplan(itinerary, result, doneActivities);
      setItinerary(merged);
      setReplannedActivities(replannedKeys);
      setIsModalOpen(false);
    } catch (err) {
      setError(err.message || 'Failed to re-plan. Please try again.');
      console.error('Replan error:', err.message);
    } finally {
      setIsReplanning(false);
    }
  }, [itinerary, doneActivities]);

  // Budget badge variant
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
        <PlanForm onSubmit={handlePlanSubmit} isLoading={isLoading} />

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
              {/* Map */}
              <MapView activities={allActivities} />

              {/* Itinerary header */}
              <section className="itinerary-section" aria-label="Your itinerary">
                <div className="itinerary-header">
                  <h2 className="itinerary-title">
                    📍 {itinerary.destination} — {itinerary.days?.length || 0} Day{(itinerary.days?.length || 0) !== 1 ? 's' : ''}
                  </h2>
                  <span className={`budget-badge ${budgetVariant}`}>
                    💰 ₹{budgetRemaining.toLocaleString('en-IN')} remaining
                  </span>
                </div>

                {/* Day cards */}
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

          {!itinerary && !isLoading && !error && (
            <div className="empty-state">
              <div className="empty-state-icon">🌏</div>
              <p className="empty-state-text">
                Fill in your trip details above and let AI plan your adventure!
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Detour FAB — only visible when itinerary exists */}
      {itinerary && !isLoading && (
        <button
          className="detour-fab"
          onClick={() => setIsModalOpen(true)}
          aria-label="Report a disruption to re-plan your trip"
        >
          ⚡ Something Changed
        </button>
      )}

      {/* Detour Modal */}
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
