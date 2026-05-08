import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Primary model with fallback for high-demand 503 errors
const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'];

/**
 * Sanitize user input by stripping HTML tags to prevent injection.
 * @param {string} text - Raw user input
 * @returns {string} Sanitized text
 */
export function sanitizeInput(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/<[^>]*>/g, '').trim();
}

/**
 * Parse a JSON response from Gemini, handling markdown fences.
 * Exported for unit testing.
 * @param {string} raw - Raw response text from Gemini
 * @returns {object} Parsed JSON object
 */
export function parseGeminiJSON(raw) {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  return JSON.parse(cleaned);
}

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Call Gemini with automatic retry + model fallback on 503/overload errors.
 * Tries up to 3 times with exponential backoff, then falls back to next model.
 */
async function callWithRetry(buildRequest, maxRetries = 3) {
  const genAI = new GoogleGenerativeAI(API_KEY);

  for (const modelName of MODELS) {
    const model = genAI.getGenerativeModel({ model: modelName });

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await model.generateContent(buildRequest());
        console.log(`Gemini response received (model: ${modelName}, attempt: ${attempt})`);
        return result.response.text();
      } catch (err) {
        const is503 = err.message?.includes('503') || err.message?.includes('high demand') || err.message?.includes('overloaded');
        const isLast = attempt === maxRetries;

        if (is503 && !isLast) {
          const delay = 1000 * Math.pow(2, attempt); // 2s, 4s, 8s
          console.warn(`Model ${modelName} overloaded. Retrying in ${delay / 1000}s... (attempt ${attempt}/${maxRetries})`);
          await sleep(delay);
        } else if (is503 && isLast) {
          console.warn(`Model ${modelName} still unavailable after ${maxRetries} attempts. Trying fallback...`);
          break; // try next model
        } else {
          throw err; // non-503 errors bubble up immediately
        }
      }
    }
  }

  throw new Error('All Gemini models are currently overloaded. Please try again in a moment.');
}

/**
 * Generate a travel itinerary using Gemini.
 */
export async function generateItinerary({ destination, days, budget, style, dietary, travellerType }) {
  if (!API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY is not set. Please add it to your .env file.');
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
 * Re-plan the itinerary after a disruption using Gemini.
 */
export async function replanItinerary({ originalItinerary, doneActivities, disruption }) {
  if (!API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY is not set. Please add it to your .env file.');
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
