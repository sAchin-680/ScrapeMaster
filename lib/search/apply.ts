import { MAX_PLAUSIBLE_DISCOUNT } from '@/lib/deal';
import type { Offer } from '@/types';
import type { SearchIntent } from './intent';

type Result = { best: Offer; relevance: number };

/** The best offer's saving against its own list price, ignoring inflated MRPs. */
export function realDiscount(offer: Offer) {
  if (!offer.originalPrice || offer.originalPrice <= offer.price) return 0;
  const discount = (offer.originalPrice - offer.price) / offer.originalPrice;
  return discount < MAX_PLAUSIBLE_DISCOUNT ? discount : 0;
}

/**
 * Keep results whose best price fits the intent's range and order them as
 * asked. Also reports how many were left out, so the page can say so.
 */
export function applyIntent<T extends Result>(
  results: T[],
  intent: Pick<SearchIntent, 'min' | 'max' | 'sort'>,
) {
  const kept = results.filter(
    (r) =>
      (intent.min === undefined || r.best.price >= intent.min) &&
      (intent.max === undefined || r.best.price <= intent.max),
  );
  const sorted =
    intent.sort === 'price'
      ? [...kept].sort((a, b) => a.best.price - b.best.price)
      : intent.sort === 'discount'
        ? [...kept].sort((a, b) => realDiscount(b.best) - realDiscount(a.best))
        : kept;
  return { results: sorted, hidden: results.length - kept.length };
}
