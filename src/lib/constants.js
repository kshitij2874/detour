/**
 * Application-wide constants.
 * All magic strings and numbers are defined here — import instead of hardcoding.
 */

/** Gemini model names in priority order (primary → fallbacks). */
export const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'];

/** Max retry attempts per model before falling back to the next. */
export const MAX_RETRIES = 3;

/** Retry delay in ms for each attempt (exponential backoff). */
export const RETRY_DELAYS_MS = [2000, 4000, 8000];

/** Maximum budget accepted in the plan form (INR). */
export const MAX_BUDGET_INR = 500_000;

/** Minimum valid budget (INR). */
export const MIN_BUDGET_INR = 100;

/** Trip duration constraints. */
export const MIN_DAYS = 1;
export const MAX_DAYS = 7;

/** localStorage keys. */
export const STORAGE_KEYS = {
  TRIP: 'detour_trip',
  DONE: 'detour_done',
};

/** Number of Places API requests to batch concurrently. */
export const PLACES_BATCH_SIZE = 4;

/** Search radius for Places nearbySearch (metres). */
export const PLACES_SEARCH_RADIUS_M = 2000;

/** Activity type values returned by Gemini. */
export const ACTIVITY_TYPES = {
  FOOD: 'Food',
  SIGHTSEEING: 'Sightseeing',
  TRANSPORT: 'Transport',
  STAY: 'Stay',
};

/** Budget warning threshold — percentage of totalBudget remaining. */
export const BUDGET_WARNING_THRESHOLD = 0.15;
