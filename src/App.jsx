import { useState, useCallback, useMemo, useEffect } from 'react';
import './index.css';
import PlanForm from './components/PlanForm';
import ItineraryCard from './components/ItineraryCard';
import MapView from './components/MapView';
import DetourModal from './components/DetourModal';
import YouTubeVideos from './components/YouTubeVideos';
import ErrorBoundary from './components/ErrorBoundary';
import { generateItinerary, replanItinerary } from './lib/gemini';
import { enrichItinerary } from './lib/places';
import { fetchTravelTimes } from './lib/directions';
import logger from './lib/logger';
import {
  STORAGE_KEYS,
  BUDGET_WARNING_THRESHOLD,
} from './lib/constants';

const STORAGE_KEY = STORAGE_KEYS.TRIP;
const STORAGE_DONE_KEY = STORAGE_KEYS.DONE;

export function calculateBudgetRemaining(itinerary) {
  if (!itinerary || !itinerary.days) return 0;
  const spent = itinerary.days.reduce((s, d) =>
    s + d.activities.reduce((ds, a) => ds + (a.estimatedCost || 0), 0), 0);
  return (itinerary.totalBudget || 0) - spent;
}

export function mergeReplan(original, replanned, doneKeys) {
  const replannedKeys = new Set();
  const merged = { ...replanned };
  merged.days = merged.days.map((day, dayIdx) => {
    const origDay = original.days[dayIdx];
    if (!origDay) return day;
    const activities = day.activities.map((activity, actIdx) => {
      const key = `${day.day}-${actIdx}`;
      if (doneKeys.has(key) && origDay.activities[actIdx]) return { ...origDay.activities[actIdx] };
      if (origDay.activities[actIdx] && origDay.activities[actIdx].name !== activity.name) {
        replannedKeys.add(key);
      }
      return activity;
    });
    return { ...day, activities };
  });
  return { merged, replannedKeys };
}

function loadSavedTrip() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
}
function loadSavedDone() {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_DONE_KEY))); } catch { return new Set(); }
}

function App() {
  const [itinerary, setItinerary]           = useState(null);
  const [savedTrip, setSavedTrip]           = useState(null);
  const [isLoading, setIsLoading]           = useState(false);
  const [isReplanning, setIsReplanning]     = useState(false);
  const [error, setError]                   = useState(null);
  const [doneActivities, setDoneActivities] = useState(new Set());
  const [replannedActivities, setReplannedActivities] = useState(new Set());
  const [isModalOpen, setIsModalOpen]       = useState(false);
  const [placeData, setPlaceData]           = useState({});
  const [travelTimes, setTravelTimes]       = useState({});
  const [isEnriching, setIsEnriching]       = useState(false);

  // Load saved trip on mount
  useEffect(() => {
    const saved = loadSavedTrip();
    if (saved) setSavedTrip(saved);
  }, []);

  // Persist itinerary
  useEffect(() => {
    if (itinerary) localStorage.setItem(STORAGE_KEY, JSON.stringify(itinerary));
  }, [itinerary]);

  // Persist done activities
  useEffect(() => {
    localStorage.setItem(STORAGE_DONE_KEY, JSON.stringify([...doneActivities]));
  }, [doneActivities]);

  // Enrich with Places + Directions whenever itinerary changes
  useEffect(() => {
    if (!itinerary) return;
    setPlaceData({});
    setTravelTimes({});
    setIsEnriching(true);

    enrichItinerary(itinerary, itinerary.destination)
      .then((data) => setPlaceData(data))
      .catch((err) => { logger.error('Places enrichment failed', err); })
      .finally(() => setIsEnriching(false));

    fetchTravelTimes(itinerary)
      .then((times) => setTravelTimes(times))
      .catch((err) => { logger.error('Directions fetch failed', err); });
  }, [itinerary]);

  const allActivities = useMemo(() => {
    if (!itinerary?.days) return [];
    return itinerary.days.flatMap((d) => d.activities);
  }, [itinerary]);

  const budgetRemaining = useMemo(() => calculateBudgetRemaining(itinerary), [itinerary]);

  const handleResume = useCallback(() => {
    setItinerary(savedTrip);
    setDoneActivities(loadSavedDone());
    setSavedTrip(null);
  }, [savedTrip]);

  const handleStartNew = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_DONE_KEY);
    setSavedTrip(null);
    setItinerary(null);
    setDoneActivities(new Set());
    setReplannedActivities(new Set());
    setPlaceData({});
    setTravelTimes({});
    setError(null);
  }, []);

  const handlePlanSubmit = useCallback(async (formData) => {
    setIsLoading(true);
    setError(null);
    setItinerary(null);
    setDoneActivities(new Set());
    setReplannedActivities(new Set());
    setSavedTrip(null);
    setPlaceData({});
    setTravelTimes({});
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

  const handleToggleDone = useCallback((key) => {
    setDoneActivities((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const handleReplan = useCallback(async (disruption) => {
    if (!itinerary) return;
    setIsReplanning(true);
    setError(null);
    try {
      const doneNames = [];
      itinerary.days.forEach((day) =>
        day.activities.forEach((a, idx) => {
          if (doneActivities.has(`${day.day}-${idx}`)) doneNames.push(a.name);
        })
      );
      const result = await replanItinerary({ originalItinerary: itinerary, doneActivities: doneNames, disruption });
      const { merged, replannedKeys } = mergeReplan(itinerary, result, doneActivities);
      setItinerary(merged);
      setReplannedActivities(replannedKeys);
      setIsModalOpen(false);
    } catch (err) {
      setError(err.message || 'Failed to re-plan. Please try again.');
    } finally {
      setIsReplanning(false);
    }
  }, [itinerary, doneActivities]);

  const budgetVariant = budgetRemaining < 0 ? 'danger'
    : budgetRemaining < (itinerary?.totalBudget || 0) * BUDGET_WARNING_THRESHOLD ? 'warning' : '';

  return (
    <>
      <header className="app-header">
        <h1 className="app-logo"><span className="app-logo-icon">🧭</span>Detour</h1>
        <p className="app-tagline">AI-powered travel re-planning for Indian adventures</p>
      </header>

      <main>
        {savedTrip && !itinerary && (
          <div className="saved-trip-banner" role="region" aria-label="Saved trip detected">
            <div className="saved-trip-info">
              <span className="saved-trip-icon">📌</span>
              <span>You have a saved trip to <strong>{savedTrip.destination}</strong>. Continue planning?</span>
            </div>
            <div className="saved-trip-actions">
              <button className="btn-resume" onClick={handleResume} aria-label={`Resume trip to ${savedTrip.destination}`}>✅ Resume Trip</button>
              <button className="btn-new" onClick={handleStartNew} aria-label="Start new trip">🗑️ Start New Trip</button>
            </div>
          </div>
        )}

        {!itinerary && !isLoading && (
          <PlanForm onSubmit={handlePlanSubmit} isLoading={isLoading} />
        )}

        {itinerary && !isLoading && (
          <div style={{ marginBottom: 16, textAlign: 'right' }}>
            <button className="btn-new" onClick={handleStartNew} aria-label="Start new trip">🗑️ Start New Trip</button>
          </div>
        )}

        {error && <div className="error-banner" role="alert"><span>⚠️</span><span>{error}</span></div>}

        <div role="status" aria-live="polite" aria-busy={isLoading || isReplanning}>
          {isLoading && (
            <div className="loading-container">
              <div className="spinner"></div>
              <span className="loading-text">Crafting your perfect itinerary…</span>
            </div>
          )}

          {itinerary && !isLoading && (
            <ErrorBoundary onReset={handleStartNew}>
              {/* YouTube Videos */}
              <YouTubeVideos destination={itinerary.destination} />

              {/* Map */}
              <MapView activities={allActivities} />

              {/* Itinerary */}
              <section className="itinerary-section" aria-label="Your itinerary">
                <div className="itinerary-header">
                  <h2 className="itinerary-title">
                    📍 {itinerary.destination} — {itinerary.days?.length || 0} Day{itinerary.days?.length !== 1 ? 's' : ''}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isEnriching && (
                      <span className="enriching-badge">🔍 Enriching with Places…</span>
                    )}
                    <span className={`budget-badge ${budgetVariant}`}>
                      💰 ₹{budgetRemaining.toLocaleString('en-IN')} remaining
                    </span>
                  </div>
                </div>

                {itinerary.days?.map((day) => (
                  <ItineraryCard
                    key={day.day}
                    dayData={day}
                    doneActivities={doneActivities}
                    onToggleDone={handleToggleDone}
                    replannedActivities={replannedActivities}
                    placeData={placeData}
                    travelTimes={travelTimes}
                  />
                ))}
              </section>
            </ErrorBoundary>
          )}

          {!itinerary && !isLoading && !error && !savedTrip && (
            <div className="empty-state">
              <div className="empty-state-icon">🌏</div>
              <p className="empty-state-text">Fill in your trip details above and let AI plan your adventure!</p>
            </div>
          )}
        </div>
      </main>

      {itinerary && !isLoading && (
        <button className="detour-fab" onClick={() => setIsModalOpen(true)} aria-label="Report a disruption">
          ⚡ Something Changed
        </button>
      )}

      <DetourModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleReplan} isLoading={isReplanning} />

      <nav aria-label="Footer" style={{ textAlign: 'center', padding: '32px 0 16px', color: '#94A3B8', fontSize: '0.8rem' }}>
        Built with Gemini AI · Google Maps · Places · Directions · YouTube · © 2026 Detour
      </nav>
    </>
  );
}

export default App;
