import { describe, expect, it } from 'vitest';
import { applyIntent, realDiscount } from '@/lib/search/apply';
import type { Offer } from '@/types';

const offer = (price: number, originalPrice?: number): Offer => ({
  store: 'amazon',
  storeName: 'Amazon',
  title: `Item ${price}`,
  url: `https://example.com/${price}`,
  price,
  originalPrice,
  currency: '₹',
});
const result = (price: number, originalPrice?: number) => ({
  best: offer(price, originalPrice),
  relevance: 1,
});

describe('realDiscount', () => {
  it('measures against the list price and ignores inflated MRPs', () => {
    expect(realDiscount(offer(800, 1000))).toBeCloseTo(0.2);
    expect(realDiscount(offer(1000))).toBe(0);
    expect(realDiscount(offer(1000, 900))).toBe(0);
    expect(realDiscount(offer(200, 1000))).toBe(0);
  });
});

describe('applyIntent', () => {
  const results = [result(25000, 30000), result(15000, 20000), result(18000, 19000)];

  it('filters by price range and reports what was hidden', () => {
    const { results: kept, hidden } = applyIntent(results, {
      max: 20000,
      sort: 'relevance',
    });
    expect(kept.map((r) => r.best.price)).toEqual([15000, 18000]);
    expect(hidden).toBe(1);
    expect(
      applyIntent(results, { min: 16000, max: 26000, sort: 'relevance' }).hidden,
    ).toBe(1);
  });

  it('sorts cheapest first or by real discount', () => {
    expect(
      applyIntent(results, { sort: 'price' }).results.map((r) => r.best.price),
    ).toEqual([15000, 18000, 25000]);
    expect(
      applyIntent(results, { sort: 'discount' }).results.map((r) => r.best.price),
    ).toEqual([15000, 25000, 18000]);
  });

  it('keeps the store order when no sort is asked for', () => {
    expect(applyIntent(results, { sort: 'relevance' }).results).toEqual(results);
  });
});
