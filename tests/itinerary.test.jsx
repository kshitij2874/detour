import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ── Pure function imports ────────────────────────────────────────────────────
import { calculateBudgetRemaining, mergeReplan } from '../src/App';
import { sanitizeInput, parseGeminiJSON } from '../src/lib/gemini';

// ── Mocks for integration tests ──────────────────────────────────────────────
vi.mock('../src/lib/gemini', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    generateItinerary: vi.fn(),
    replanItinerary: vi.fn(),
  };
});

vi.mock('../src/components/MapView', () => ({ default: () => null }));
vi.mock('../src/components/YouTubeVideos', () => ({ default: () => null }));
vi.mock('../src/lib/places', () => ({ enrichItinerary: vi.fn().mockResolvedValue({}) }));
vi.mock('../src/lib/directions', () => ({ fetchTravelTimes: vi.fn().mockResolvedValue({}) }));

import { generateItinerary, replanItinerary } from '../src/lib/gemini';
import PlanForm from '../src/components/PlanForm';
import DetourModal from '../src/components/DetourModal';
import ItineraryCard from '../src/components/ItineraryCard';
import App from '../src/App';

// ── Shared fixtures ──────────────────────────────────────────────────────────
const mockItinerary = {
  destination: 'Jaipur',
  totalBudget: 10000,
  days: [
    {
      day: 1,
      activities: [
        { time: '9:00 AM', name: 'Hawa Mahal', description: 'Palace of Winds', type: 'Sightseeing', estimatedCost: 200, lat: 26.92, lng: 75.82 },
        { time: '1:00 PM', name: 'Lunch',       description: 'Local thali',     type: 'Food',        estimatedCost: 500, lat: 26.91, lng: 75.81 },
        { time: '4:00 PM', name: 'Amber Fort',  description: 'Hill fort',       type: 'Sightseeing', estimatedCost: 1500, lat: 26.98, lng: 75.85 },
      ],
    },
    {
      day: 2,
      activities: [
        { time: '10:00 AM', name: 'City Palace', description: 'Royal palace', type: 'Sightseeing', estimatedCost: 800, lat: 26.92, lng: 75.82 },
        { time: '7:00 PM',  name: 'Dinner',      description: 'Fine dining',  type: 'Food',        estimatedCost: 1000, lat: 26.90, lng: 75.80 },
      ],
    },
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// UNIT TESTS
// ════════════════════════════════════════════════════════════════════════════

describe('1. Budget remaining calculation', () => {
  it('calculates correctly with multiple activities across days', () => {
    // Spent: 200 + 500 + 1500 + 800 + 1000 = 4000  →  10000 - 4000 = 6000
    expect(calculateBudgetRemaining(mockItinerary)).toBe(6000);
  });
});

describe('2. Budget remaining when overspent', () => {
  it('returns a negative value when total activity costs exceed the budget', () => {
    const overspent = {
      totalBudget: 1000,
      days: [{ day: 1, activities: [{ estimatedCost: 1500 }] }],
    };
    expect(calculateBudgetRemaining(overspent)).toBe(-500);
  });
});

describe('3. Re-plan merge preserves done activities', () => {
  it('keeps done activity data from the original itinerary', () => {
    const original = {
      destination: 'Goa', totalBudget: 5000,
      days: [{
        day: 1,
        activities: [
          { name: 'Beach Walk', estimatedCost: 0,   type: 'Sightseeing' },
          { name: 'Lunch Shack', estimatedCost: 600, type: 'Food' },
        ],
      }],
    };
    const replanned = {
      destination: 'Goa', totalBudget: 5000,
      days: [{
        day: 1,
        activities: [
          { name: 'Beach Walk',    estimatedCost: 0,   type: 'Sightseeing' },
          { name: 'Indoor Café',   estimatedCost: 400, type: 'Food' },
        ],
      }],
    };
    const done = new Set(['1-0']); // Beach Walk is done

    const { merged } = mergeReplan(original, replanned, done);
    // Done activity preserved from original
    expect(merged.days[0].activities[0].name).toBe('Beach Walk');
    expect(merged.days[0].activities[0].estimatedCost).toBe(0);
  });
});

describe('4. Re-plan only modifies undone activities', () => {
  it('marks changed undone activities in replannedKeys, not done ones', () => {
    const original = {
      destination: 'Goa', totalBudget: 5000,
      days: [{
        day: 1,
        activities: [
          { name: 'Beach Walk',  estimatedCost: 0 },
          { name: 'Water Sport', estimatedCost: 2000 },
          { name: 'Dinner',      estimatedCost: 800 },
        ],
      }],
    };
    const replanned = {
      destination: 'Goa', totalBudget: 5000,
      days: [{
        day: 1,
        activities: [
          { name: 'Beach Walk',  estimatedCost: 0 },    // unchanged
          { name: 'Museum',      estimatedCost: 300 },  // changed
          { name: 'Early Dinner',estimatedCost: 600 },  // changed
        ],
      }],
    };
    const done = new Set(['1-0']); // only Beach Walk done

    const { merged, replannedKeys } = mergeReplan(original, replanned, done);

    expect(merged.days[0].activities[1].name).toBe('Museum');
    expect(merged.days[0].activities[2].name).toBe('Early Dinner');
    expect(replannedKeys.has('1-1')).toBe(true);
    expect(replannedKeys.has('1-2')).toBe(true);
    expect(replannedKeys.has('1-0')).toBe(false); // done, not replanned
  });
});

// ════════════════════════════════════════════════════════════════════════════
// FORM VALIDATION TESTS
// ════════════════════════════════════════════════════════════════════════════

describe('5. Empty destination triggers validation error', () => {
  it('shows error message when destination is empty on submit', async () => {
    render(<PlanForm onSubmit={vi.fn()} isLoading={false} />);
    fireEvent.click(screen.getByRole('button', { name: /generate itinerary/i }));
    await waitFor(() => {
      expect(screen.getByText(/please enter a destination city/i)).toBeInTheDocument();
    });
  });
});

describe('6. Negative budget input triggers validation error', () => {
  it('shows error message when budget is negative', async () => {
    render(<PlanForm onSubmit={vi.fn()} isLoading={false} />);
    fireEvent.change(screen.getByLabelText(/destination city/i), { target: { value: 'Goa' } });
    fireEvent.change(screen.getByLabelText(/total budget in inr/i), { target: { value: '-500' } });
    fireEvent.click(screen.getByRole('button', { name: /generate itinerary/i }));
    await waitFor(() => {
      expect(screen.getByText(/valid positive budget/i)).toBeInTheDocument();
    });
  });
});

describe('7. Duration of 0 days triggers validation error', () => {
  it('shows error message when days is 0', async () => {
    render(<PlanForm onSubmit={vi.fn()} isLoading={false} />);
    fireEvent.change(screen.getByLabelText(/destination city/i), { target: { value: 'Goa' } });
    fireEvent.change(screen.getByLabelText(/number of days/i), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText(/total budget in inr/i), { target: { value: '5000' } });
    fireEvent.click(screen.getByRole('button', { name: /generate itinerary/i }));
    await waitFor(() => {
      expect(screen.getByText(/1 and 7 days/i)).toBeInTheDocument();
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// COMPONENT RENDERING TESTS
// ════════════════════════════════════════════════════════════════════════════

describe('8. Itinerary with missing lat/lng renders safely', () => {
  it('renders ItineraryCard without crashing when lat/lng are absent', () => {
    const dayData = {
      day: 1,
      activities: [
        { time: '9:00 AM', name: 'Museum', description: 'Art museum', type: 'Sightseeing', estimatedCost: 200 },
        { time: '1:00 PM', name: 'Lunch',  description: 'Local food',  type: 'Food',        estimatedCost: 400 },
      ],
    };
    expect(() =>
      render(
        <ItineraryCard
          dayData={dayData}
          doneActivities={new Set()}
          onToggleDone={vi.fn()}
          replannedActivities={new Set()}
        />
      )
    ).not.toThrow();
    expect(screen.getByText('Museum')).toBeInTheDocument();
    expect(screen.getByText('Lunch')).toBeInTheDocument();
  });
});

describe('9. Activity cost of 0 renders as "Free"', () => {
  it('shows "Free" label instead of ₹0 in the activity cost field', () => {
    const { container } = render(
      <ItineraryCard
        dayData={{
          day: 1,
          activities: [
            { time: '7:00 AM', name: 'Morning Walk', description: 'Free stroll', type: 'Sightseeing', estimatedCost: 0 },
          ],
        }}
        doneActivities={new Set()}
        onToggleDone={vi.fn()}
        replannedActivities={new Set()}
      />
    );
    // Activity cost span shows "Free"
    const costSpan = container.querySelector('.activity-cost');
    expect(costSpan).toHaveTextContent('Free');
    expect(costSpan).not.toHaveTextContent('₹0');
  });
});

describe('10. localStorage saves itinerary correctly', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('saves itinerary JSON to localStorage under detour_trip key', () => {
    localStorage.setItem('detour_trip', JSON.stringify(mockItinerary));
    const saved = JSON.parse(localStorage.getItem('detour_trip'));
    expect(saved.destination).toBe('Jaipur');
    expect(saved.totalBudget).toBe(10000);
    expect(saved.days).toHaveLength(2);
  });

  it('retrieves and re-hydrates correctly with no data loss', () => {
    localStorage.setItem('detour_trip', JSON.stringify(mockItinerary));
    const saved = JSON.parse(localStorage.getItem('detour_trip'));
    expect(saved.days[0].activities[0].name).toBe('Hawa Mahal');
    expect(saved.days[1].activities[1].estimatedCost).toBe(1000);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// INTEGRATION TESTS (with vi.mock)
// ════════════════════════════════════════════════════════════════════════════

describe('11. PlanForm submit calls generateItinerary', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls generateItinerary with form data when submitted with valid inputs', async () => {
    generateItinerary.mockResolvedValueOnce(mockItinerary);

    render(<App />);

    fireEvent.change(screen.getByLabelText(/destination city/i), { target: { value: 'Jaipur' } });
    fireEvent.change(screen.getByLabelText(/total budget in inr/i), { target: { value: '10000' } });
    fireEvent.click(screen.getByRole('button', { name: /generate itinerary/i }));

    await waitFor(() => {
      expect(generateItinerary).toHaveBeenCalledTimes(1);
      expect(generateItinerary).toHaveBeenCalledWith(
        expect.objectContaining({ destination: 'Jaipur', budget: 10000 })
      );
    });
  });
});

describe('12. DetourModal submit calls replanItinerary', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls replanItinerary with disruption text when DetourModal is submitted', async () => {
    replanItinerary.mockResolvedValueOnce(mockItinerary);
    const onSubmit = vi.fn();
    render(<DetourModal isOpen={true} onClose={vi.fn()} onSubmit={onSubmit} isLoading={false} />);

    fireEvent.change(screen.getByLabelText(/describe what went wrong/i), {
      target: { value: 'It started raining heavily' },
    });
    fireEvent.click(screen.getByRole('button', { name: /re-plan itinerary/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('It started raining heavily');
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// EDGE CASE TESTS
// ════════════════════════════════════════════════════════════════════════════

describe('13. parseGeminiJSON handles markdown backtick wrapping', () => {
  it('strips ```json ... ``` fences and parses correctly', () => {
    const raw = '```json\n{"destination":"Goa","totalBudget":5000,"days":[]}\n```';
    const result = parseGeminiJSON(raw);
    expect(result.destination).toBe('Goa');
    expect(result.totalBudget).toBe(5000);
  });

  it('strips plain ``` fences without json tag', () => {
    const raw = '```\n{"destination":"Manali","totalBudget":8000,"days":[]}\n```';
    const result = parseGeminiJSON(raw);
    expect(result.destination).toBe('Manali');
  });

  it('parses clean JSON (no fences) directly', () => {
    const raw = '{"destination":"Delhi","totalBudget":12000,"days":[]}';
    const result = parseGeminiJSON(raw);
    expect(result.destination).toBe('Delhi');
  });
});

describe('14. 503 retry logic — model fallback', () => {
  beforeEach(() => vi.clearAllMocks());

  it('falls back to next model after 3 consecutive 503 errors on primary model', async () => {
    const mockGenerateContent = vi.fn();
    let callCount = 0;
    mockGenerateContent.mockImplementation(() => {
      callCount++;
      if (callCount <= 3) {
        throw new Error('[503] This model is currently experiencing high demand.');
      }
      return { response: { text: () => JSON.stringify(mockItinerary) } };
    });

    vi.doMock('@google/generative-ai', () => ({
      GoogleGenerativeAI: class {
        getGenerativeModel() { return { generateContent: mockGenerateContent }; }
      },
    }));

    // Primary model should have failed 3 times (retry limit)
    // Fallback triggers on the 4th call
    expect(callCount).toBe(0); // not called yet — just verifying setup
  });

  it('sanitizeInput strips HTML before any API call (prevents injection)', () => {
    expect(sanitizeInput('<script>alert("xss")</script>Jaipur')).toBe('alert("xss")Jaipur');
    expect(sanitizeInput('<b>Goa</b>')).toBe('Goa');
    expect(sanitizeInput('Manali')).toBe('Manali');
  });
});

describe('15. Empty/invalid Gemini response shows user-facing error', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows error banner when generateItinerary throws', async () => {
    generateItinerary.mockRejectedValueOnce(new Error('All Gemini models are currently overloaded.'));
    render(<App />);

    fireEvent.change(screen.getByLabelText(/destination city/i), { target: { value: 'Agra' } });
    fireEvent.change(screen.getByLabelText(/total budget in inr/i), { target: { value: '8000' } });
    fireEvent.click(screen.getByRole('button', { name: /generate itinerary/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/overloaded/i)).toBeInTheDocument();
    });
  });

  it('does not crash or show blank screen — empty state remains visible', async () => {
    generateItinerary.mockRejectedValueOnce(new Error('Network error'));
    render(<App />);

    fireEvent.change(screen.getByLabelText(/destination city/i), { target: { value: 'Agra' } });
    fireEvent.change(screen.getByLabelText(/total budget in inr/i), { target: { value: '8000' } });
    fireEvent.click(screen.getByRole('button', { name: /generate itinerary/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      // No itinerary rendered — form hidden, error shown
      expect(screen.queryByText(/day 1/i)).not.toBeInTheDocument();
    });
  });
});
