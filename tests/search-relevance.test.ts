import { describe, expect, it } from 'vitest';
import { relevance } from '@/lib/scraper/search';

describe('search relevance', () => {
  it('trusts the store for generic category searches', () => {
    // "phone" is a stopword for product matching, so nothing specific is left.
    expect(relevance('phone', 'Samsung Galaxy S24 5G AI Smartphone (8GB, 256GB)')).toBe(
      1,
    );
    expect(relevance('bluetooth phone', 'Redmi 13 5G')).toBe(1);
  });

  it('matches category words through synonyms', () => {
    expect(
      relevance('tv', 'Sony Bravia 139 cm (55 inches) 4K Ultra HD Smart LED Television'),
    ).toBe(1);
    expect(relevance('earbuds', 'boAt Airdopes 141 TWS with 42H playtime')).toBe(1);
    expect(relevance('laptop', 'Apple MacBook Air M3 13-inch')).toBe(1);
  });

  it('does not treat different categories as synonyms', () => {
    expect(relevance('earbuds', 'Sony WH-1000XM5 Over-Ear Headphones')).toBe(0);
    expect(relevance('tv', 'Wall mount stand for monitors')).toBe(0);
  });

  it('still requires the specific words of a query', () => {
    expect(relevance('pixel 9 phone', 'Samsung Galaxy S24 Smartphone')).toBe(0);
    expect(relevance('pixel 9 phone', 'Google Pixel 9 (Obsidian, 128 GB)')).toBe(1);
  });
});
