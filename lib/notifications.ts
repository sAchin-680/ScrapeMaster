import type { NotificationType, PriceHistoryItem } from '@/types';
import { formatPrice, truncate } from '@/lib/utils/format';
import { getLowestPrice } from '@/lib/utils/price';

export const Notification = {
  WELCOME: 'WELCOME',
  CHANGE_OF_STOCK: 'CHANGE_OF_STOCK',
  LOWEST_PRICE: 'LOWEST_PRICE',
  THRESHOLD_MET: 'THRESHOLD_MET',
} as const satisfies Record<NotificationType, NotificationType>;

export const THRESHOLD_PERCENTAGE = 40;

type Snapshot = {
  currentPrice: number;
  discountRate: number;
  isOutOfStock: boolean;
};

/** Decide which alert (if any) a fresh scrape should trigger. */
export function getEmailNotifType(
  scraped: Snapshot,
  previous: {
    priceHistory: PriceHistoryItem[];
    isOutOfStock: boolean;
    discountRate?: number;
  },
): NotificationType | null {
  const lowestPrice = getLowestPrice(previous.priceHistory);

  if (lowestPrice && scraped.currentPrice > 0 && scraped.currentPrice < lowestPrice) {
    return Notification.LOWEST_PRICE;
  }
  if (!scraped.isOutOfStock && previous.isOutOfStock) {
    return Notification.CHANGE_OF_STOCK;
  }
  if (
    scraped.discountRate >= THRESHOLD_PERCENTAGE &&
    (previous.discountRate ?? 0) < THRESHOLD_PERCENTAGE
  ) {
    return Notification.THRESHOLD_MET;
  }
  return null;
}

/** Short text for a device notification about a price event. */
export function pushMessage(
  type: NotificationType,
  product: {
    _id: string;
    title: string;
    currentPrice: number;
    currency: string;
    image?: string;
  },
) {
  const name = truncate(product.title, 60);
  const price = formatPrice(product.currentPrice, product.currency);
  const title =
    type === Notification.LOWEST_PRICE
      ? `Lowest price yet: ${price}`
      : type === Notification.CHANGE_OF_STOCK
        ? `Back in stock at ${price}`
        : type === Notification.THRESHOLD_MET
          ? `${THRESHOLD_PERCENTAGE}%+ off now: ${price}`
          : `Price update: ${price}`;
  return {
    title,
    body: name,
    url: `/products/${product._id}`,
    image: product.image,
    tag: product._id,
  };
}
