import { useState, useCallback, useMemo, useEffect } from 'react';
import '../index.css';
import PlanForm from '../components/PlanForm';
import ItineraryCard from '../components/ItineraryCard';
import MapView from '../components/MapView';
import DetourModal from '../components/DetourModal';
import YouTubeVideos from '../components/YouTubeVideos';
import ErrorBoundary from '../components/ErrorBoundary';
import LoadingScreen from '../components/LoadingScreen';
import { generateItinerary, replanItinerary } from '../lib/gemini';
import { enrichItinerary } from '../lib/places';
import { fetchTravelTimes } from '../lib/directions';
import logger from '../lib/logger';
import { STORAGE_KEYS, BUDGET_WARNING_THRESHOLD } from '../lib/constants';

const STORAGE_KEY = STORAGE_KEYS.TRIP;
const STORAGE_DONE_KEY = STORAGE_KEYS.DONE;

/**
 * calculateBudgetRemaining — pure function, exported for unit testing.
 * @param {Object} itinerary - Full itinerary object
 * @returns {number} Budget remaining in INR (can be negative if overspent)
 */
export function calculateBudgetRemaining(itinerary) {
  if (!itinerary || !itinerary.days) return 0;
  const spent = itinerary.days.reduce(
    (s, d) => s + d.activities.reduce((ds, a) => ds + (a.estimatedCost || 0), 0), 0
  );
  return (itinerary.totalBudget || 0) - spent;
}

/**
 * mergeReplan — merge a re-planned itinerary with done activities preserved.
 * @param {Object} original - Original itinerary before re-plan
 * @param {Object} replanned - Re-planned itinerary from Gemini
 * @param {Set<string>} doneKeys - Keys of activities already completed
 * @returns {{ merged: Object, replannedKeys: Set<string> }}
 */
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

/**
 * PlannerApp — the main travel planning interface.
 * Handles all state: itinerary generation, re-planning, Places enrichment,
 * travel times, done-activity tracking, and localStorage persistence.
 */
export default function PlannerApp() {
  const [itinerary, setItinerary]                     = useState(null);
  const [savedTrip, setSavedTrip]                     = useState(null);
  const [isLoading, setIsLoading]                     = useState(false);
  const [isReplanning, setIsReplanning]               = useState(false);
  const [error, setError]                             = useState(null);
  const [doneActivities, setDoneActivities]           = useState(new Set());
  const [replannedActivities, setReplannedActivities] = useState(new Set());
  const [isModalOpen, setIsModalOpen]                 = useState(false);
  const [placeData, setPlaceData]                     = useState({});
  const [travelTimes, setTravelTimes]                 = useState({});
  const [isEnriching, setIsEnriching]                 = useState(false);
  const [geocodedCenter, setGeocodedCenter]           = useState(null);

  useEffect(() => {
    const saved = loadSavedTrip();
    if (saved) setSavedTrip(saved);
  }, []);

  useEffect(() => {
    if (itinerary) localStorage.setItem(STORAGE_KEY, JSON.stringify(itinerary));
  }, [itinerary]);

  useEffect(() => {
    localStorage.setItem(STORAGE_DONE_KEY, JSON.stringify([...doneActivities]));
  }, [doneActivities]);

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
    setGeocodedCenter(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_DONE_KEY);

    // Geocode destination for map centering — falls back silently if it fails.
    let enrichedFormData = formData;
    try {
      const MAPS_KEY = import.meta.env.VITE_MAPS_API_KEY;
      if (MAPS_KEY) {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(formData.destination)}&key=${MAPS_KEY}`
        );
        const data = await res.json();
        const loc = data.results?.[0]?.geometry?.location;
        if (loc) {
          setGeocodedCenter({ lat: loc.lat, lng: loc.lng });
          enrichedFormData = { ...formData, geocodedLat: loc.lat, geocodedLng: loc.lng };
        }
      }
    } catch {
      logger.warn('Geocoding failed — proceeding with text-only destination');
    }

    try {
      const result = await generateItinerary(enrichedFormData);
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
    <div className="planner-root">
      <header className="planner-header">
        <nav className="planner-nav" role="navigation" aria-label="Planner navigation">
          <div className="planner-logo">
            <span aria-hidden="true">🧭</span>
            <span className="planner-logo-text serif">Detour</span>
          </div>
          <a href="#/" className="planner-back-link" aria-label="Back to landing page">← Home</a>
        </nav>
      </header>

      <main className="planner-main">
        {savedTrip && !itinerary && (
          <div className="saved-trip-banner" role="region" aria-label="Saved trip detected">
            <div className="saved-trip-info">
              <span className="saved-trip-icon" aria-hidden="true">📌</span>
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
          <div className="start-new-row">
            <button className="btn-new" onClick={handleStartNew} aria-label="Start new trip">🗑️ Start New Trip</button>
          </div>
        )}

        {error && (
          <div className="error-banner" role="alert">
            <span aria-hidden="true">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div role="status" aria-live="polite" aria-busy={isLoading || isReplanning}>
          {isLoading && <LoadingScreen />}

          {itinerary && !isLoading && (
            <ErrorBoundary onReset={handleStartNew}>
              <YouTubeVideos destination={itinerary.destination} />
              <MapView activities={allActivities} initialCenter={geocodedCenter} />

              <section className="itinerary-section" aria-label="Your itinerary">
                <div className="itinerary-header">
                  <h2 className="itinerary-title serif">
                    📍 {itinerary.destination} — {itinerary.days?.length || 0} Day{itinerary.days?.length !== 1 ? 's' : ''}
                  </h2>
                  <div className="itinerary-header-meta">
                    {isEnriching && <span className="enriching-badge">🔍 Enriching with Places…</span>}
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
              <div className="empty-state-icon" aria-hidden="true">🌏</div>
              <p className="empty-state-text">Fill in your trip details above and let AI plan your adventure!</p>
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

      <footer className="planner-footer" role="contentinfo">
        Built with Gemini AI · Google Maps · Places · Directions · YouTube · © 2026 Detour
      </footer>
    </div>
  );
}
