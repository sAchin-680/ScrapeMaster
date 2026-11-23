import { describe, expect, it } from 'vitest';
import { parseIds, serializeIds, toggleId, WATCHLIST_LIMIT } from '@/lib/watchlist';

const id = (n: number) => n.toString(16).padStart(24, '0');

describe('watchlist ids', () => {
  it('keeps only valid, unique ids', () => {
    expect(parseIds(`${id(1)}.${id(2)}.${id(1)}.nope.${'g'.repeat(24)}`)).toEqual([
      id(1),
      id(2),
    ]);
    expect(parseIds(`${id(3)},${id(4)}`)).toEqual([id(3), id(4)]);
    expect(parseIds(undefined)).toEqual([]);
    expect(parseIds('')).toEqual([]);
  });

  it('caps the list', () => {
    const many = Array.from({ length: WATCHLIST_LIMIT + 5 }, (_, i) => id(i + 1));
    expect(parseIds(serializeIds(many))).toHaveLength(WATCHLIST_LIMIT);
    expect(parseIds(serializeIds(many), 4)).toEqual(many.slice(0, 4));
  });

  it('toggles ids with new saves first', () => {
    expect(toggleId([id(1)], id(2))).toEqual([id(2), id(1)]);
    expect(toggleId([id(2), id(1)], id(2))).toEqual([id(1)]);
  });

  it('round-trips through the cookie format', () => {
    expect(parseIds(serializeIds([id(5), id(6)]))).toEqual([id(5), id(6)]);
  });
});
