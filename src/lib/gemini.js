import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

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
 * @param {string} raw - Raw response text from Gemini
 * @returns {object} Parsed JSON object
 */
function parseGeminiJSON(raw) {
  let cleaned = raw.trim();
  // Strip markdown code fences if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  return JSON.parse(cleaned);
}

/**
 * Generate a travel itinerary using Gemini 2.0 Flash.
 * @param {object} params
 * @param {string} params.destination - Destination city
 * @param {number} params.days - Number of days (1–7)
 * @param {number} params.budget - Total budget in INR
 * @param {string} params.style - Travel style
 * @param {string} params.dietary - Dietary preference
 * @param {string} params.travellerType - Traveller type
 * @returns {Promise<object>} Itinerary JSON
 */
export async function generateItinerary({ destination, days, budget, style, dietary, travellerType }) {
  if (!API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY is not set. Please add it to your .env file.');
  }

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const systemPrompt = `You are a travel planning assistant for Indian destinations. 
Return ONLY a valid JSON object, no markdown, no explanation. 
Format: { "destination": string, "totalBudget": number, "days": [ { "day": number, "activities": [ { "time": string, "name": string, "description": string, "type": "Food"|"Sightseeing"|"Transport"|"Stay", "estimatedCost": number, "lat": number, "lng": number } ] } ] }`;

  const userPrompt = `Plan a ${days}-day trip to ${sanitizeInput(destination)} with a total budget of ₹${budget}. 
Travel style: ${sanitizeInput(style)}. 
Dietary preference: ${sanitizeInput(dietary)}. 
Traveller type: ${sanitizeInput(travellerType)}.
Include real venues with accurate GPS coordinates. Each activity must have a realistic estimated cost in INR.
The total of all estimated costs should stay within the ₹${budget} budget.`;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
  });

  const response = result.response;
  const text = response.text();
  console.log('Gemini plan response received');

  return parseGeminiJSON(text);
}

/**
 * Re-plan the itinerary after a disruption using Gemini 2.0 Flash.
 * @param {object} params
 * @param {object} params.originalItinerary - The full original itinerary JSON
 * @param {Array<string>} params.doneActivities - List of activity names already done
 * @param {string} params.disruption - What went wrong
 * @returns {Promise<object>} Updated itinerary JSON
 */
export async function replanItinerary({ originalItinerary, doneActivities, disruption }) {
  if (!API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY is not set. Please add it to your .env file.');
  }

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const systemPrompt = `You are a travel re-planning assistant. The traveller has described a disruption mid-trip. Re-plan ONLY the remaining undone activities for the affected time period. Keep all done activities unchanged. Return the same JSON structure as the original itinerary, with only the undone activities modified. Return ONLY valid JSON, no markdown, no explanation.
Format: { "destination": string, "totalBudget": number, "days": [ { "day": number, "activities": [ { "time": string, "name": string, "description": string, "type": "Food"|"Sightseeing"|"Transport"|"Stay", "estimatedCost": number, "lat": number, "lng": number } ] } ] }`;

  const userPrompt = `Original itinerary:
${JSON.stringify(originalItinerary, null, 2)}

Activities already completed (DO NOT change these):
${JSON.stringify(doneActivities)}

Disruption reported by traveller: "${sanitizeInput(disruption)}"

Please re-plan only the undone activities considering this disruption. Keep the same budget and destination. Return the complete itinerary with done activities preserved exactly as-is and undone activities re-planned.`;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
  });

  const response = result.response;
  const text = response.text();
  console.log('Gemini re-plan response received');

  return parseGeminiJSON(text);
}
