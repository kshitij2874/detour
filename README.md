# Detour — AI Travel Re-Planner 🧭

An AI-powered travel planning and **re-planning** web app for Indian destinations. Plan your trip, track progress mid-journey, and dynamically re-plan when things change — powered by **Google Gemini 2.0 Flash**.

## Features

- **🗺️ Smart Itinerary Generation** — AI generates day-by-day plans with real venues, GPS coordinates, and budget estimates
- **📍 Interactive Map** — Google Maps with numbered markers and route polyline for every activity
- **⚡ Detour Mode** — Mid-trip disruption? Describe what happened and get an instant re-plan for remaining activities
- **✅ Progress Tracking** — Mark activities as done with checkboxes; done activities are preserved during re-planning
- **💰 Live Budget Tracking** — Running budget remaining calculated from activity costs
- **♿ Accessible** — WCAG AA compliant with proper ARIA labels, focus styles, and semantic HTML

## Tech Stack

- **React 19** (Vite)
- **Google Gemini 2.0 Flash** — itinerary generation + re-planning
- **Google Maps JavaScript API** — route visualization with markers
- **Google Fonts** — Inter font family
- **Vitest** — unit testing
- Plain CSS (no external libraries)

## Getting Started

### Prerequisites

- Node.js 18+
- Google Gemini API key ([Get one here](https://aistudio.google.com/apikey))
- Google Maps API key ([Get one here](https://console.cloud.google.com/google/maps-apis))

### Setup

```bash
# Clone the repo
git clone <your-repo-url>
cd detour

# Install dependencies
npm install

# Copy environment template and add your keys
cp .env.example .env
# Edit .env with your actual API keys
```

### Environment Variables

| Variable | Description |
|---|---|
| `VITE_GEMINI_API_KEY` | Google Gemini API key |
| `VITE_MAPS_API_KEY` | Google Maps JavaScript API key |

> ⚠️ Never commit your `.env` file. It is already in `.gitignore`.

### Run Development Server

```bash
npm run dev
```

### Run Tests

```bash
npx vitest run
```

## Project Structure

```
src/
  components/
    PlanForm.jsx        ← Trip planning input form
    ItineraryCard.jsx   ← Day/activity card with done checkboxes
    DetourModal.jsx     ← Disruption input modal
    MapView.jsx         ← Google Maps with markers + polyline
  lib/
    gemini.js           ← All Gemini API calls (plan + replan)
  App.jsx               ← Main app orchestrator
tests/
  itinerary.test.js     ← Unit tests (budget, merge, validation)
```

## How Detour Mode Works

1. Plan your trip normally using the form
2. As you travel, check off completed activities
3. When something goes wrong (rain, missed bus, overspending), click **"⚡ Something Changed"**
4. Describe the disruption — AI re-plans only the remaining activities
5. Re-planned activities are highlighted with a yellow border
6. Map updates to reflect the new plan

## Security

- API keys read from environment variables only
- User inputs sanitized (HTML tags stripped) before sending to Gemini
- Content-Security-Policy meta tag in index.html
- Budget input validated as positive number

## License

MIT
