import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from './logger';
import { GEMINI_MODELS, MAX_RETRIES, RETRY_DELAYS_MS } from './constants';

/** Gemini API key — read from environment variable only, never hardcoded. */
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Strip HTML tags from user-supplied text to prevent prompt injection.
 * @param {string} text - Raw user input
 * @returns {string} Sanitized text with all HTML tags removed
 */
export function sanitizeInput(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/<[^>]*>/g, '').trim();
}

/**
 * Parse a JSON string returned by Gemini, stripping optional markdown fences.
 * Exported for unit testing.
 * @param {string} raw - Raw response text (may be wrapped in ```json ... ```)
 * @returns {Object} Parsed itinerary or re-plan JSON object
 * @throws {SyntaxError} If the cleaned string is not valid JSON
 */
export function parseGeminiJSON(raw) {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*\n?/, '')
      .replace(/\n?```\s*$/, '');
  }
  return JSON.parse(cleaned);
}

/**
 * Pause execution for a given number of milliseconds.
 * @param {number} ms - Duration to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Detect whether an error is a transient 503 / overload error from the API.
 * @param {Error} err - The caught error
 * @returns {boolean}
 */
function is503Error(err) {
  const msg = err?.message ?? '';
  return (
    msg.includes('503') ||
    msg.includes('high demand') ||
    msg.includes('overloaded')
  );
}

// ─── Core API Caller ──────────────────────────────────────────────────────────

/**
 * Call the Gemini API with automatic per-model retry and exponential backoff.
 *
 * Strategy:
 *  - Try each model in GEMINI_MODELS order.
 *  - On a 503 / overload error, wait RETRY_DELAYS_MS[attempt] and retry.
 *  - After MAX_RETRIES failures on a model, fall back to the next one.
 *  - Non-503 errors are rethrown immediately (no retry).
 *
 * @param {function(): Object} buildRequest - Factory that returns the generateContent payload.
 *   Called fresh on each attempt in case the payload needs to be regenerated.
 * @returns {Promise<string>} Raw text response from Gemini
 * @throws {Error} When all models are exhausted or a non-503 error occurs
 */
async function callWithRetry(buildRequest) {
  const genAI = new GoogleGenerativeAI(API_KEY);

  for (const modelName of GEMINI_MODELS) {
    const model = genAI.getGenerativeModel({ model: modelName });

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await model.generateContent(buildRequest());
        logger.log(`Response received (model: ${modelName}, attempt: ${attempt})`);
        return result.response.text();
      } catch (err) {
        const isOverload = is503Error(err);
        const isLastAttempt = attempt === MAX_RETRIES;

        if (isOverload && !isLastAttempt) {
          const delay = RETRY_DELAYS_MS[attempt - 1] ?? 2000;
          logger.warn(
            `Model ${modelName} overloaded. Retrying in ${delay / 1000}s (attempt ${attempt}/${MAX_RETRIES})`
          );
          await sleep(delay);
        } else if (isOverload && isLastAttempt) {
          logger.warn(
            `Model ${modelName} still unavailable after ${MAX_RETRIES} attempts. Trying fallback…`
          );
          break; // move to next model
        } else {
          throw err; // non-transient error — surface immediately
        }
      }
    }
  }

  throw new Error(
    'All Gemini models are currently overloaded. Please try again in a moment.'
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a day-wise travel itinerary using the Gemini API.
 *
 * @param {Object} preferences - User travel preferences
 * @param {string} preferences.destination - Target Indian city or region
 * @param {number} preferences.days - Trip duration (1–7)
 * @param {number} preferences.budget - Total budget in INR
 * @param {string} preferences.style - Travel style (Adventure / Relaxed / Cultural / Foodie)
 * @param {string} preferences.dietary - Dietary preference (Veg Only / All)
 * @param {string} preferences.travellerType - Solo / Couple / Family
 * @returns {Promise<Object>} Structured itinerary JSON matching the Gemini schema
 * @throws {Error} If API key is missing or all models are unavailable
 */
export async function generateItinerary({
  destination,
  days,
  budget,
  style,
  dietary,
  travellerType,
}) {
  if (!API_KEY) {
    throw new Error(
      'VITE_GEMINI_API_KEY is not set. Please add it to your .env file.'
    );
  }

  const systemPrompt = `You are a travel planning assistant for Indian destinations. 
Return ONLY a valid JSON object, no markdown, no explanation. 
Format: { "destination": string, "totalBudget": number, "days": [ { "day": number, "activities": [ { "time": string, "name": string, "description": string, "type": "Food"|"Sightseeing"|"Transport"|"Stay", "estimatedCost": number, "lat": number, "lng": number } ] } ] }`;

  const userPrompt = `Plan a ${days}-day trip to ${sanitizeInput(destination)} with a total budget of ₹${budget}. 
Travel style: ${sanitizeInput(style)}. 
Dietary preference: ${sanitizeInput(dietary)}. 
Traveller type: ${sanitizeInput(travellerType)}.
Include real venues with accurate GPS coordinates. Each activity must have a realistic estimated cost in INR.
The total of all estimated costs should stay within the ₹${budget} budget.`;

  const text = await callWithRetry(() => ({
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
  }));

  return parseGeminiJSON(text);
}

/**
 * Re-plan a trip itinerary after a mid-trip disruption.
 *
 * Only undone activities are modified; completed activities are preserved
 * exactly as-is in the merged output produced by App.mergeReplan.
 *
 * @param {Object} params - Re-plan parameters
 * @param {Object} params.originalItinerary - The full itinerary JSON before the disruption
 * @param {string[]} params.doneActivities - Names of activities already completed
 * @param {string} params.disruption - Free-text description of what went wrong
 * @returns {Promise<Object>} Updated itinerary JSON with undone activities re-planned
 * @throws {Error} If API key is missing or all models are unavailable
 */
export async function replanItinerary({
  originalItinerary,
  doneActivities,
  disruption,
}) {
  if (!API_KEY) {
    throw new Error(
      'VITE_GEMINI_API_KEY is not set. Please add it to your .env file.'
    );
  }

  const systemPrompt = `You are a travel re-planning assistant. The traveller has described a disruption mid-trip. Re-plan ONLY the remaining undone activities for the affected time period. Keep all done activities unchanged. Return the same JSON structure as the original itinerary, with only the undone activities modified. Return ONLY valid JSON, no markdown, no explanation.
Format: { "destination": string, "totalBudget": number, "days": [ { "day": number, "activities": [ { "time": string, "name": string, "description": string, "type": "Food"|"Sightseeing"|"Transport"|"Stay", "estimatedCost": number, "lat": number, "lng": number } ] } ] }`;

  const userPrompt = `Original itinerary:
${JSON.stringify(originalItinerary, null, 2)}

Activities already completed (DO NOT change these):
${JSON.stringify(doneActivities)}

Disruption reported by traveller: "${sanitizeInput(disruption)}"

Please re-plan only the undone activities considering this disruption. Keep the same budget and destination. Return the complete itinerary with done activities preserved exactly as-is and undone activities re-planned.`;

  const text = await callWithRetry(() => ({
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
  }));

  return parseGeminiJSON(text);
}
