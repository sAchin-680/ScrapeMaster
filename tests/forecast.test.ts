import { describe, expect, it } from 'vitest';
import { forecastPrice, slopePerDay } from '@/lib/forecast';

const DAY = 86_400_000;
const NOW = Date.parse('2026-11-23T12:00:00Z');
/** One price per day, ending today. */
const daily = (prices: number[]) =>
  prices.map((price, i) => ({
    price,
    date: new Date(NOW - (prices.length - 1 - i) * DAY).toISOString(),
  }));
const product = (prices: number[], extra = {}) => ({
  currentPrice: prices[prices.length - 1],
  lowestPrice: Math.min(...prices),
  priceHistory: daily(prices),
  store: 'flipkart',
  storeName: 'Flipkart',
  ...extra,
});

describe('slopePerDay', () => {
  it('fits a straight line through prices', () => {
    const series = [0, 1, 2, 3].map((d) => ({ t: d * DAY, price: 1000 - d * 10 }));
    expect(slopePerDay(series)).toBeCloseTo(-10);
    expect(slopePerDay(series.slice(0, 1))).toBe(0);
  });
});

describe('forecastPrice', () => {
  it('says nothing without enough history or a sale', () => {
    expect(forecastPrice(product([1000, 990]), [], NOW)).toBeNull();
    expect(
      forecastPrice(product([1000, 1000, 1000, 1000, 1000, 1000]), [], NOW),
    ).toBeNull();
  });

  it('advises waiting while prices fall', () => {
    const f = forecastPrice(
      product([1200, 1180, 1150, 1120, 1100, 1080, 1060]),
      [],
      NOW,
    )!;
    expect(f.advice).toBe('wait');
    // Today is the lowest so far, so the headline agrees with a "great deal" badge.
    expect(f.headline).toBe('Lowest yet, and still falling');
    expect(f.reasons[0]).toMatch(/^Falling about \d+% a week over the last 6 days\.$/);
    expect(f.weeklyTrend).toBeLessThan(-0.02);
  });

  it('says a fall above the low is likely to continue', () => {
    const f = forecastPrice(
      product([1400, 1350, 1300, 1250, 1200, 1150, 1100], { lowestPrice: 900 }),
      [],
      NOW,
    )!;
    expect(f.headline).toBe('Likely to drop further');
  });

  it('advises buying at the recorded low', () => {
    const f = forecastPrice(product([1100, 1150, 1120, 1130, 1100, 1000]), [], NOW)!;
    expect(f.advice).toBe('buy');
    expect(f.reasons).toContain('At or near the lowest price recorded.');
  });

  it('flags prices that are often lower', () => {
    const f = forecastPrice(
      product([900, 1000, 900, 1000, 900, 1000, 1000, 1000]),
      [],
      NOW,
    )!;
    expect(f.dipRate).toBeCloseTo(3 / 8);
    expect(f.reasons.some((r) => r.includes('5% cheaper'))).toBe(true);
  });

  it('waits for an upcoming sale on the same store', () => {
    const sales = [
      {
        name: 'Big Billion Days',
        store: 'Flipkart',
        status: 'upcoming' as const,
        start: NOW + 12 * DAY,
      },
      {
        name: 'Great Indian Festival',
        store: 'Amazon',
        status: 'upcoming' as const,
        start: NOW + 3 * DAY,
      },
    ];
    const f = forecastPrice(product([1000, 1000]), sales, NOW)!;
    expect(f).toMatchObject({
      advice: 'wait',
      headline: 'Wait for Big Billion Days',
      sale: { name: 'Big Billion Days', live: false, days: 12 },
    });
  });

  it('ignores sales too far away and favours a live one', () => {
    const far = [
      {
        name: 'Big Billion Days',
        store: 'flipkart',
        status: 'upcoming' as const,
        start: NOW + 60 * DAY,
      },
    ];
    expect(forecastPrice(product([1000, 1000]), far, NOW)).toBeNull();
    const live = [
      { name: 'Black Friday Sale', store: 'flipkart', status: 'live' as const },
    ];
    expect(forecastPrice(product([1000, 1000]), live, NOW)).toMatchObject({
      advice: 'buy',
      headline: 'Buy during Black Friday Sale',
    });
  });
});
