import { describe, expect, it } from 'vitest';
import { amazonPriceFilter } from '@/lib/scraper/stores/amazon';
import { isAllowed, parseRobots } from '@/lib/scraper/robots';

describe('amazonPriceFilter', () => {
  it('encodes bounds in the minor currency unit', () => {
    expect(amazonPriceFilter({ min: 1500, max: 2500 })).toBe('&rh=p_36%3A150000-250000');
    expect(amazonPriceFilter({ max: 20000 })).toBe('&rh=p_36%3A-2000000');
    expect(amazonPriceFilter({ min: 30000 })).toBe('&rh=p_36%3A3000000-');
    expect(amazonPriceFilter({})).toBe('');
    expect(amazonPriceFilter()).toBe('');
  });

  it('builds search URLs that Amazon robots.txt allows', () => {
    // The relevant rules from amazon.in/robots.txt for all user agents.
    const rules = parseRobots(
      'User-agent: *\nDisallow: */s?k=*&rh=n*p_*p_*p_\nDisallow: /s?*rh=n%3A1380045031\n',
    );
    const path = `/s?k=earbuds${amazonPriceFilter({ min: 1500, max: 2500 })}`;
    expect(isAllowed(rules, path)).toBe(true);
  });
});
