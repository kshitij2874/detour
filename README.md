# Detour

> AI-powered travel planning that adapts when life doesn't go to plan.

**Live Demo:** [https://kshitij2874.github.io/detour/](https://kshitij2874.github.io/detour/)

Built at **PromptWars Hyderabad 2026** by Hack2skill, using Google Antigravity.

---

## Chosen Vertical

**Travel Planning & Experience Engine** — Plan trips dynamically with preferences, constraints, and real-time updates.

---

## The Problem

Every travel app plans your trip. None of them help when the trip falls apart.

You miss a train. The weather flips. The museum closed early. Your budget didn't survive lunch. Your beautiful, AI-generated itinerary is now wrong — and you're scrolling through Google Maps at a tea stall trying to figure out what's still open.

Detour is built for the moment after the plan breaks.

---

## The Solution

Detour is a two-mode travel companion:

1. **Plan Mode** — Generate a day-wise itinerary from natural language preferences (destination, budget, vibe, constraints).
2. **Detour Mode** — Tell the app what changed mid-trip. It re-plans only the remaining activities while preserving everything you've already done.

The differentiator isn't the planner. It's the **re-planner**.

---

## How It Works

### 1. Plan a trip
The user provides:
- Destination
- Trip duration (days)
- Total budget (INR)
- Travel style (Adventure / Relaxed / Cultural / Foodie)
- Dietary preference (Veg only / All)
- Traveller type (Solo / Couple / Family)

Gemini 2.0 Flash receives a structured prompt and returns a JSON itinerary with day-by-day activities, time slots, costs, and geo-coordinates for each stop.

### 2. Visualize on Google Maps
Each itinerary stop drops as a numbered marker on an embedded Google Maps view. Markers are connected by a polyline showing the route. Clicking a marker opens venue details and estimated cost.

### 3. Detour when reality hits
A persistent "⚡ Something Changed" button opens a free-text disruption input. The user describes what happened ("missed the 2 PM bus", "raining heavily", "overspent ₹2000 on lunch"). Gemini receives:
- The original full itinerary
- Activities marked as completed
- The disruption description

It returns a re-planned schedule that preserves done activities and modifies only what remains. Re-planned activities are visually highlighted with an amber ring and "Re-planned" badge.

### 4. Trip persists
The itinerary is saved to `localStorage`, so users can close the tab, return later, and resume Detour Mode without losing context. No login required.

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│                  React (Vite)                     │
│  ┌──────────┐  ┌─────────────┐  ┌──────────────┐ │
│  │ PlanForm │→ │ ItineraryCard│→ │ DetourModal  │ │
│  └──────────┘  └─────────────┘  └──────────────┘ │
│         ↓             ↓                ↓          │
│  ┌──────────────────────────────────────────────┐│
│  │              gemini.js (lib)                  ││
│  │  - generateItinerary()                        ││
│  │  - replanItinerary()                          ││
│  │  - Exponential backoff retry (2s → 4s → 8s)  ││
│  │  - Model fallback chain                       ││
│  └──────────────────────────────────────────────┘│
│         ↓                                         │
│  ┌──────────────────────────────────────────────┐│
│  │            Google Services                    ││
│  │  • Gemini 2.0 Flash      • Maps JS API       ││
│  │  • Places API            • Directions API    ││
│  │  • YouTube Data API v3   • Calendar URL API  ││
│  └──────────────────────────────────────────────┘│
└──────────────────────────────────────────────────┘
```

---

## Google Services Integrated

| Service | Purpose |
|---|---|
| **Gemini 2.0 Flash API** | Itinerary generation and dynamic re-planning |
| **Google Maps JavaScript API** | Route visualization with numbered markers and polylines |
| **Google Places API** | Real venue data, ratings, photos, opening hours |
| **Google Directions API** | Travel time estimates between activities |
| **YouTube Data API v3** | Destination travel videos shown above itinerary |
| **Google Calendar (URL API)** | One-click "Add to Calendar" for any activity |
| **Google Fonts** | Inter and Instrument Serif typography |

---

## Tech Stack

- **Frontend:** React 18 + Vite + React Router (HashRouter)
- **Styling:** Tailwind CSS + custom liquid-glass design system
- **Animation:** framer-motion + custom CSS keyframes
- **Icons:** lucide-react
- **AI:** Google Gemini 2.0 Flash via REST API
- **Testing:** Vitest
- **Type Safety:** PropTypes
- **Deployment:** GitHub Pages with GitHub Actions auto-deploy

---

## Resilience Engineering

The Gemini API call layer is built defensively:

1. **Exponential backoff retry** — On 503 (model overloaded), retries after 2s → 4s → 8s
2. **Model fallback chain** — If `gemini-2.0-flash` stays unavailable after 3 retries, automatically falls back to `gemini-2.0-flash-lite`, then `gemini-1.5-flash`
3. **Markdown sanitization** — Strips ` ```json ` wrappers before parsing (Gemini occasionally wraps JSON in code blocks)
4. **Fast-fail on permanent errors** — 401/403/400 errors don't retry — they surface immediately
5. **Input validation** — Budget, duration, and destination validated client-side before API call

---

## Security

- All API keys stored in environment variables (`VITE_GEMINI_API_KEY`, `VITE_MAPS_API_KEY`)
- Zero hardcoded credentials anywhere in the codebase
- `.env` excluded via `.gitignore`
- `.env.example` committed with placeholder values for setup reference
- User input sanitized (HTML stripped) before passing to Gemini
- Content-Security-Policy meta tag in `index.html`
- API keys restricted to specific Google services in GCP console

---

## Accessibility

- Semantic HTML throughout (`<main>`, `<section>`, `<article>`, `<nav>`, `<header>`, `<footer>`)
- ARIA labels on every interactive element
- `role="status"` and `aria-live="polite"` on dynamic itinerary container
- `aria-busy="true"` during loading states
- WCAG AA contrast compliance (all body text ≥ `text-white/70` on dark backgrounds)
- Visible focus rings on all focusable elements
- Re-planned activities indicated by both visual ring AND text badge (color-independent)
- Decorative videos marked `aria-hidden="true"`
- Keyboard navigable across all flows

---

## Testing

Comprehensive test suite using Vitest covering:

**Unit tests**
- Budget remaining calculation across multiple activities
- Budget never returns negative when overspent
- Re-plan merge preserves activities marked as done
- Re-plan modifies only undone activities
- Input validation (empty destination, negative budget, zero duration)
- Itinerary renders safely with missing lat/lng
- Activity cost of 0 renders as "Free"
- localStorage persistence

**Integration tests**
- PlanForm submit triggers correct gemini.js call with mocked API
- DetourModal submit triggers replanItinerary with mocked API

**Edge case tests**
- Markdown-wrapped Gemini responses parse correctly
- 503 retry logic attempts 3 times before model fallback
- Empty Gemini response surfaces user-friendly error

Run tests: `npm test`

---

## Local Setup

```bash
# Clone repository
git clone https://github.com/kshitij2874/detour.git
cd detour

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your keys:
#   VITE_GEMINI_API_KEY=your_gemini_key (from aistudio.google.com)
#   VITE_MAPS_API_KEY=your_maps_key (from console.cloud.google.com)

# Run development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

---

## Required GCP APIs

Enable these in [Google Cloud Console](https://console.cloud.google.com) under your project:

- Generative Language API (Gemini)
- Maps JavaScript API
- Places API
- Directions API
- YouTube Data API v3

The Maps API key requires referrer restrictions for your deployed domain (e.g., `kshitij2874.github.io/*`).

---

## Project Structure

```
detour/
├── src/
│   ├── pages/
│   │   ├── LandingPage.jsx         Cinematic landing page
│   │   └── PlannerApp.jsx          Main planner application
│   ├── components/
│   │   ├── PlanForm.jsx            Trip preference input
│   │   ├── ItineraryCard.jsx       Day-wise itinerary card
│   │   ├── DetourModal.jsx         Mid-trip re-planner
│   │   ├── MapView.jsx             Google Maps integration
│   │   ├── LoadingScreen.jsx       Animated loading state
│   │   ├── HowItWorksSection.jsx   Landing page section
│   │   └── FeatureShowcaseSection.jsx
│   ├── lib/
│   │   ├── gemini.js               All Gemini API calls
│   │   └── constants.js            Magic strings/numbers extracted
│   └── App.jsx                     Router setup
├── tests/
│   └── itinerary.test.js           Vitest test suite
├── .env.example
├── .gitignore
├── vite.config.js
└── README.md
```

---

## Assumptions

1. **Geographic focus** — Optimized for Indian destinations. Currency is INR. Place name disambiguation favors Indian cities.
2. **Single traveller default** — Form defaults to solo, adjustable via traveller type toggle.
3. **Real-time data** — Weather, transport delays, and venue closures are user-described in Detour Mode rather than fetched live (keeps API surface small and avoids rate limits).
4. **Itinerary granularity** — Activities are time-blocked at hourly resolution (Morning / Afternoon / Evening), not minute-precise.
5. **Persistence model** — Single active trip stored in `localStorage`. Multi-trip management was scoped out for this hackathon build.
6. **Anonymous use** — No authentication. Users can resume their trip on the same device/browser without signing in.

---

## What's Next (Post-Hackathon)

- Multi-trip management with optional Google sign-in
- Live weather integration via Google Weather API
- Voice input for Detour disruptions (Web Speech API)
- Collaborative trip editing for groups
- Export to PDF and share-link generation
- Native mobile app via React Native

---

## Built With Google Antigravity

This entire project was built using **Google Antigravity** — Google's agentic AI development environment. The build process leveraged:

- Antigravity's Agent Manager for multi-step task planning
- Gemini-powered code generation with human-in-the-loop review
- Built-in browser surface for live testing and debugging
- Single-window orchestration of build → test → deploy cycles

Total build time: ~6 hours.

---

## Author

**Kshitij Vatsa**  
Senior DevOps Engineer & Cloud Architect | KritxLabs Co-Founder  
[GitHub](https://github.com/kshitij2874) · [LinkedIn](https://linkedin.com/in/kvatsa5)

---

## Acknowledgments

- **Hack2skill** for organizing PromptWars Hyderabad
- **Google** for Antigravity, Gemini, and the GCP credits that powered deployment
- **iSprout, HITEC City** for the venue, the lunch, and the caffeine

---

## License

MIT — built for a hackathon, free for anyone to learn from or fork.
