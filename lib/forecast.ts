import type { PriceHistoryItem } from '@/types';

/**
 * Buy-or-wait outlook from a product's own recorded prices and its store's
 * sale calendar. Plain statistics, computed on the server: a trend line over
 * the last month, how often the price dipped below today's, and whether a
 * sale is on or coming. It explains every signal it uses and says nothing
 * when it has too little to go on.
 */

export type SaleEvent = {
  name: string;
  /** Store display name or id, matched loosely against the product's store. */
  store: string;
  status: 'live' | 'upcoming';
  /** Start time (ms) for upcoming sales from the calendar, when known. */
  start?: number;
};

export type Forecast = {
  advice: 'buy' | 'wait';
  headline: string;
  reasons: string[];
  /** Weekly price change implied by the recent trend, as a fraction. */
  weeklyTrend?: number;
  /** Share of recent checks at least 5% cheaper than today. */
  dipRate?: number;
  sale?: { name: string; live: boolean; days?: number };
};

type Input = {
  currentPrice: number;
  lowestPrice: number;
  priceHistory: PriceHistoryItem[];
  store: string;
  storeName?: string;
};

const DAY = 86_400_000;
const TREND_WINDOW = 30 * DAY;
const DIP_WINDOW = 90 * DAY;
const SALE_HORIZON_DAYS = 30;
const MIN_POINTS = 5;
const MIN_SPAN = 3 * DAY;

const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

function points(history: PriceHistoryItem[]) {
  return history
    .filter((h) => h.date && h.price > 0)
    .map((h) => ({ t: new Date(h.date!).getTime(), price: h.price }))
    .filter((p) => Number.isFinite(p.t))
    .sort((a, b) => a.t - b.t);
}

/** Least-squares slope of price over time, in price units per day. */
export function slopePerDay(series: { t: number; price: number }[]) {
  const n = series.length;
  if (n < 2) return 0;
  const xs = series.map((p) => p.t / DAY);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = series.reduce((a, p) => a + p.price, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (series[i].price - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  return den ? num / den : 0;
}

function nextSale(input: Input, sales: SaleEvent[], now: number): Forecast['sale'] {
  const stores = new Set([key(input.store), key(input.storeName ?? '')].filter(Boolean));
  const mine = sales.filter((s) => stores.has(key(s.store)));
  const live = mine.find((s) => s.status === 'live');
  if (live) return { name: live.name, live: true };
  const upcoming = mine
    .filter((s) => s.status === 'upcoming' && s.start !== undefined && s.start > now)
    .map((s) => ({ name: s.name, live: false, days: Math.ceil((s.start! - now) / DAY) }))
    .filter((s) => s.days <= SALE_HORIZON_DAYS)
    .sort((a, b) => a.days - b.days)[0];
  return upcoming;
}

export function forecastPrice(
  input: Input,
  sales: SaleEvent[] = [],
  now = Date.now(),
): Forecast | null {
  const series = points(input.priceHistory);
  const enoughHistory =
    series.length >= MIN_POINTS && series[series.length - 1].t - series[0].t >= MIN_SPAN;
  const sale = nextSale(input, sales, now);
  if (!enoughHistory && !sale) return null;

  const wait: string[] = [];
  const buy: string[] = [];
  let weeklyTrend: number | undefined;
  let dipRate: number | undefined;

  if (enoughHistory) {
    // The trend leading up to today: a sudden drop to a new low is a moment to
    // buy, not evidence of a slide, so today's price is left out of the fit.
    const recent = series.filter((p) => p.t >= now - TREND_WINDOW).slice(0, -1);
    if (recent.length >= 3) {
      weeklyTrend = (slopePerDay(recent) * 7) / input.currentPrice;
      const pct = Math.round(Math.abs(weeklyTrend) * 100);
      // Name the span the trend really covers, which can be shorter than a month.
      const days = Math.round((series[series.length - 1].t - recent[0].t) / DAY);
      const span = days >= 28 ? 'the last month' : `the last ${days} days`;
      if (weeklyTrend <= -0.02) wait.push(`Falling about ${pct}% a week over ${span}.`);
      if (weeklyTrend >= 0.02) buy.push(`Rising about ${pct}% a week over ${span}.`);
    }

    const window = series.filter((p) => p.t >= now - DIP_WINDOW);
    if (window.length >= MIN_POINTS) {
      dipRate =
        window.filter((p) => p.price <= input.currentPrice * 0.95).length / window.length;
      if (dipRate >= 0.25) {
        wait.push(
          `At least 5% cheaper in ${Math.round(dipRate * 100)}% of recent price checks.`,
        );
      }
    }

    // A low only means something if the price has moved, and not while it is
    // still sliding: in a steady fall, today is always the lowest so far.
    const highest = Math.max(...series.map((p) => p.price));
    const falling = weeklyTrend !== undefined && weeklyTrend <= -0.02;
    if (
      !falling &&
      highest > input.lowestPrice * 1.02 &&
      input.currentPrice <= input.lowestPrice * 1.02
    ) {
      buy.push('At or near the lowest price recorded.');
    }
  }

  if (sale?.live) buy.push(`${sale.name} is live on this store now.`);
  if (sale && !sale.live) {
    wait.push(
      `${sale.name} starts in ${sale.days} ${sale.days === 1 ? 'day' : 'days'}. Big sales often bring lower prices.`,
    );
  }

  if (!wait.length && !buy.length) return null;

  const advice = wait.length > buy.length ? 'wait' : 'buy';
  const headline =
    advice === 'buy'
      ? sale?.live
        ? `Buy during ${sale.name}`
        : buy.some((r) => r.startsWith('Rising'))
          ? 'Prices are climbing'
          : 'Good time to buy'
      : sale && !sale.live
        ? `Wait for ${sale.name}`
        : weeklyTrend !== undefined && weeklyTrend <= -0.02
          ? // Agree with the deal badge, which calls a record low a great deal.
            input.currentPrice <= input.lowestPrice * 1.02
            ? 'Lowest yet, and still falling'
            : 'Likely to drop further'
          : 'Often cheaper than this';

  return {
    advice,
    headline,
    reasons: advice === 'buy' ? [...buy, ...wait] : [...wait, ...buy],
    weeklyTrend,
    dipRate,
    sale,
  };
}
