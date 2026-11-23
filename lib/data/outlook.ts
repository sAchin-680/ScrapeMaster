import 'server-only';
import { getActiveSales } from '@/lib/data/sales';
import { forecastPrice, type SaleEvent } from '@/lib/forecast';
import { getSaleStatus } from '@/lib/sales';
import { regionFromCurrency } from '@/lib/scraper/stores';
import { saleSignalFeed } from '@/lib/services/store-feed';
import type { Product } from '@/types';

/**
 * Sales that can move prices: the calendar plus live store banners. peek()
 * reads the cached banner feed without waiting, so pages never block on a store.
 */
export async function getSaleEvents(currency: string): Promise<SaleEvent[]> {
  const now = Date.now();
  const calendar = await getActiveSales();
  return [
    ...calendar.flatMap((sale) => {
      const status = getSaleStatus(sale, now);
      return status === 'ended'
        ? []
        : [{ name: sale.name, store: sale.store, status, start: Date.parse(sale.start) }];
    }),
    ...(saleSignalFeed(regionFromCurrency(currency)).peek()?.data.signals ?? [])
      .filter((signal) => signal.status === 'live')
      .map((signal) => ({
        name: signal.text,
        store: signal.store,
        status: 'live' as const,
      })),
  ];
}

/** Buy-or-wait outlook for a product, read at request time. */
export function outlookFor(product: Product, sales: SaleEvent[]) {
  return forecastPrice(
    { ...product, priceHistory: product.priceHistory ?? [] },
    sales,
    Date.now(),
  );
}
