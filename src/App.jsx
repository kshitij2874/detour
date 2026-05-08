import './index.css';
import { HashRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import PlannerApp from './pages/PlannerApp';

// Re-export pure functions so existing tests (import from '../src/App') still work
export { calculateBudgetRemaining, mergeReplan } from './pages/PlannerApp';

/**
 * App — top-level router.
 * Uses HashRouter for GitHub Pages (no server-side routing support).
 * Routes:
 *   #/     → LandingPage
 *   #/app  → PlannerApp (travel planner)
 */
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<PlannerApp />} />
      </Routes>
    </HashRouter>
  );
}
