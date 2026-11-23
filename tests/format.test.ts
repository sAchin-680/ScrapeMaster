import { describe, expect, it } from 'vitest';
import {
  formatPrice,
  formatRelativeTime,
  sizedImageUrl,
  truncate,
} from '@/lib/utils/format';

describe('format helpers', () => {
  it('formats prices with currency symbol', () => {
    expect(formatPrice(54999, '₹')).toBe('₹54,999');
    expect(formatPrice(undefined)).toBe('$0');
  });

  it('formats relative time', () => {
    const now = new Date('2026-01-01T12:00:00Z').getTime();
    expect(formatRelativeTime(new Date(now - 5_000), now)).toBe('just now');
    expect(formatRelativeTime(new Date(now - 3 * 60_000), now)).toBe('3 minutes ago');
    expect(formatRelativeTime(new Date(now - 2 * 86_400_000), now)).toBe('2 days ago');
  });

  it('truncates long text with an ellipsis', () => {
    expect(truncate('abcdefgh', 4)).toBe('abcd…');
    expect(truncate('abc', 4)).toBe('abc');
  });
});

describe('sizedImageUrl', () => {
  it('resizes Amazon and Flipkart images and leaves others alone', () => {
    expect(
      sizedImageUrl(
        'https://m.media-amazon.com/images/I/61ULimPWODL._AC_SL1500_.jpg',
        800,
      ),
    ).toBe('https://m.media-amazon.com/images/I/61ULimPWODL._AC_SL800_.jpg');
    expect(
      sizedImageUrl(
        'https://rukminim2.flixcart.com/image/832/832/xif0q/mobile/a.jpeg?q=70',
        400,
      ),
    ).toBe('https://rukminim2.flixcart.com/image/400/400/xif0q/mobile/a.jpeg?q=70');
    expect(sizedImageUrl('https://cdn.shop.example/x.jpg', 400)).toBe(
      'https://cdn.shop.example/x.jpg',
    );
  });

  it('matches the image host, not text elsewhere in the URL', () => {
    const lookalike = 'https://evil.example/media-amazon.com/x._AC_SL1500_.jpg';
    expect(sizedImageUrl(lookalike, 400)).toBe(lookalike);
    const query = 'https://evil.example/image/832/832/a.jpg?h=rukminim2.flixcart.com';
    expect(sizedImageUrl(query, 400)).toBe(query);
    expect(sizedImageUrl('not a url', 400)).toBe('not a url');
  });
});
