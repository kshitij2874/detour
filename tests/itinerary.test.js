import { describe, it, expect } from 'vitest';
import { calculateBudgetRemaining, mergeReplan } from '../src/App';

describe('Detour Itinerary Tests', () => {
  // Test 1: Budget remaining calculation returns correct value
  describe('calculateBudgetRemaining', () => {
    it('returns correct remaining budget when activities have costs', () => {
      const itinerary = {
        destination: 'Jaipur',
        totalBudget: 10000,
        days: [
          {
            day: 1,
            activities: [
              { time: '9:00 AM', name: 'Breakfast', estimatedCost: 300, type: 'Food' },
              { time: '11:00 AM', name: 'Hawa Mahal', estimatedCost: 200, type: 'Sightseeing' },
              { time: '1:00 PM', name: 'Lunch', estimatedCost: 500, type: 'Food' },
            ],
          },
          {
            day: 2,
            activities: [
              { time: '10:00 AM', name: 'Amber Fort', estimatedCost: 1500, type: 'Sightseeing' },
              { time: '7:00 PM', name: 'Dinner', estimatedCost: 800, type: 'Food' },
            ],
          },
        ],
      };

      const remaining = calculateBudgetRemaining(itinerary);
      // Total spent: 300 + 200 + 500 + 1500 + 800 = 3300
      // Remaining: 10000 - 3300 = 6700
      expect(remaining).toBe(6700);
    });

    it('returns total budget when no activities have costs', () => {
      const itinerary = {
        totalBudget: 5000,
        days: [
          {
            day: 1,
            activities: [
              { time: '9:00 AM', name: 'Walk', type: 'Sightseeing' },
            ],
          },
        ],
      };

      expect(calculateBudgetRemaining(itinerary)).toBe(5000);
    });

    it('returns 0 for null itinerary', () => {
      expect(calculateBudgetRemaining(null)).toBe(0);
    });
  });

  // Test 2: Re-plan merge preserves activities marked as done
  describe('mergeReplan', () => {
    it('preserves done activities and marks new ones as replanned', () => {
      const original = {
        destination: 'Goa',
        totalBudget: 15000,
        days: [
          {
            day: 1,
            activities: [
              { time: '9:00 AM', name: 'Beach Walk', estimatedCost: 0, type: 'Sightseeing', lat: 15.49, lng: 73.82 },
              { time: '12:00 PM', name: 'Lunch at Shack', estimatedCost: 600, type: 'Food', lat: 15.50, lng: 73.83 },
              { time: '3:00 PM', name: 'Water Sports', estimatedCost: 2000, type: 'Sightseeing', lat: 15.51, lng: 73.84 },
            ],
          },
        ],
      };

      const replanned = {
        destination: 'Goa',
        totalBudget: 15000,
        days: [
          {
            day: 1,
            activities: [
              { time: '9:00 AM', name: 'Beach Walk', estimatedCost: 0, type: 'Sightseeing', lat: 15.49, lng: 73.82 },
              { time: '12:00 PM', name: 'Indoor Restaurant', estimatedCost: 800, type: 'Food', lat: 15.48, lng: 73.81 },
              { time: '3:00 PM', name: 'Museum Visit', estimatedCost: 500, type: 'Sightseeing', lat: 15.47, lng: 73.80 },
            ],
          },
        ],
      };

      // Mark first activity (Beach Walk) as done
      const doneKeys = new Set(['1-0']);

      const { merged, replannedKeys } = mergeReplan(original, replanned, doneKeys);

      // Done activity should be preserved from original
      expect(merged.days[0].activities[0].name).toBe('Beach Walk');
      expect(merged.days[0].activities[0].estimatedCost).toBe(0);

      // Undone activities should be replaced with replanned versions
      expect(merged.days[0].activities[1].name).toBe('Indoor Restaurant');
      expect(merged.days[0].activities[2].name).toBe('Museum Visit');

      // Replanned keys should contain the changed activities
      expect(replannedKeys.has('1-1')).toBe(true);
      expect(replannedKeys.has('1-2')).toBe(true);

      // Done activity should NOT be in replanned
      expect(replannedKeys.has('1-0')).toBe(false);
    });
  });

  // Test 3: Empty destination triggers validation (testing sanitizeInput)
  describe('Input Validation', () => {
    it('empty destination should be treated as invalid after sanitization', async () => {
      const { sanitizeInput } = await import('../src/lib/gemini');

      // Empty string
      expect(sanitizeInput('')).toBe('');

      // Only whitespace
      expect(sanitizeInput('   ')).toBe('');

      // HTML tags only
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('alert("xss")');

      // Valid input is preserved
      expect(sanitizeInput('Jaipur')).toBe('Jaipur');

      // HTML stripped from mixed input
      expect(sanitizeInput('<b>Goa</b>')).toBe('Goa');
    });
  });
});
