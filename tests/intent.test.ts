import { describe, expect, it } from 'vitest';
import { amount, parseSearchIntent } from '@/lib/search/intent';

const parse = (q: string) => {
  const { keywords, min, max, sort } = parseSearchIntent(q);
  return { keywords, min, max, sort };
};

describe('amount', () => {
  it('reads Indian and international price formats', () => {
    expect(amount('20000')).toBe(20000);
    expect(amount('20,000')).toBe(20000);
    expect(amount('1,00,000')).toBe(100000);
    expect(amount('₹ 1,299.50')).toBe(1300);
    expect(amount('rs. 500')).toBe(500);
    expect(amount('20k')).toBe(20000);
    expect(amount('1.5 lakh')).toBe(150000);
    expect(amount('2L')).toBe(200000);
    expect(amount('1cr')).toBe(10000000);
    expect(amount('$199')).toBe(199);
    expect(amount('phone')).toBeNull();
  });
});

describe('parseSearchIntent', () => {
  it('turns a budget into a maximum price', () => {
    expect(parse('5g phone under 20k')).toEqual({
      keywords: '5g phone',
      min: undefined,
      max: 20000,
      sort: 'relevance',
    });
    expect(parse('earbuds below ₹2,000').max).toBe(2000);
    expect(parse('laptop upto 50000').max).toBe(50000);
    expect(parse('tv within 1.5 lakh').max).toBe(150000);
    expect(parse('smartwatch less than rs 3000').max).toBe(3000);
  });

  it('reads minimums, ranges and approximate prices', () => {
    expect(parse('phone above 30k')).toMatchObject({ keywords: 'phone', min: 30000 });
    expect(parse('4k tv between ₹30,000 and ₹50,000')).toMatchObject({
      keywords: '4k tv',
      min: 30000,
      max: 50000,
    });
    expect(parse('headphones 2k-5k')).toMatchObject({
      keywords: 'headphones',
      min: 2000,
      max: 5000,
    });
    expect(parse('earbuds around 2000')).toMatchObject({ min: 1500, max: 2500 });
    expect(parse('mixer grinder ₹3000')).toMatchObject({
      keywords: 'mixer grinder',
      max: 3000,
    });
  });

  it('keeps specs and model numbers as search words', () => {
    expect(parse('iphone 15 128gb')).toMatchObject({
      keywords: 'iphone 15 128gb',
      min: undefined,
      max: undefined,
    });
    expect(parse('4k tv 55 inch').keywords).toBe('4k tv 55 inch');
    expect(parse('5l air fryer').keywords).toBe('5l air fryer');
    expect(parse('rtx 4060 laptop').keywords).toBe('rtx 4060 laptop');
    expect(parse('galaxy s24 from 2024').keywords).toBe('galaxy s24 from 2024');
    expect(parse('1-2 person tent').keywords).toBe('1-2 person tent');
  });

  it('understands sort requests', () => {
    expect(parse('cheapest air fryer')).toMatchObject({
      keywords: 'air fryer',
      sort: 'price',
    });
    expect(parse('best deals on laptops')).toMatchObject({
      keywords: 'laptops',
      sort: 'discount',
    });
    expect(parse('show me the biggest discounts on headphones under 5k')).toMatchObject({
      keywords: 'headphones',
      max: 5000,
      sort: 'discount',
    });
  });

  it('drops conversational words', () => {
    expect(parse('show me the best 5G phone under 20k please?').keywords).toBe(
      '5G phone',
    );
    expect(parse('i want a good washing machine').keywords).toBe('washing machine');
  });

  it('lists each understood phrase with the query that remains without it', () => {
    const { filters } = parseSearchIntent('cheapest 5g phone under 20k');
    expect(filters).toEqual([
      { kind: 'max', value: 20000, without: 'cheapest 5g phone' },
      { kind: 'sort', value: 'price', without: '5g phone under 20k' },
    ]);
  });

  it('leaves plain queries untouched', () => {
    expect(parse('boat airdopes 141')).toEqual({
      keywords: 'boat airdopes 141',
      min: undefined,
      max: undefined,
      sort: 'relevance',
    });
    expect(parse('under 20k').keywords).toBe('');
  });
});
