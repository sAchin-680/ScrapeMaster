import type { Metadata } from 'next';
import Link from 'next/link';
import DealsSection from '@/components/DealsSection';
import HashScroll from '@/components/HashScroll';
import HeroVisual from '@/components/HeroVisual';
import HowItWorks from '@/components/HowItWorks';
import ReliabilityPanel from '@/components/ReliabilityPanel';
import SalesSection from '@/components/SalesSection';
import TrendingSection from '@/components/TrendingSection';
import { Suspense, type ComponentProps } from 'react';
import type { Region } from '@/lib/scraper/stores';
import ProductCard from '@/components/ProductCard';
import Searchbar from '@/components/Searchbar';
import Ticker from '@/components/Ticker';
import LiveBadge from '@/components/live/LiveBadge';
import { LiveProvider } from '@/components/live/LiveProvider';
import { getAllProducts, getTopDeals, getTrackerStats } from '@/lib/data/products';
import { getStoreReliability } from '@/lib/data/reliability';
import { getActiveSales } from '@/lib/data/sales';
import { filterSalesFor } from '@/lib/sales';
import {
  CURRENCIES,
  DEFAULT_PREFERENCES,
  getCountry,
  regionForCountry,
} from '@/lib/locale';
import { saleSignalFeed } from '@/lib/services/store-feed';
import { FEED_TIMEOUT_MS, withTimeout } from '@/lib/utils/timeout';
import { formatNumber } from '@/lib/utils';

// Static page regenerated in the background at most once a minute (ISR):
// visitors get cached HTML instantly while fresh data is prepared.
export const revalidate = 60;

export const metadata: Metadata = { alternates: { canonical: '/' } };

// Plain-language searches the search parser understands (lib/search/intent.ts).
const EXAMPLE_SEARCHES = [
  '5G phone under 20k',
  'cheapest air fryer',
  'earbuds around ₹2,000',
];

/** Streams in once store homepages have been checked for sale banners. */
async function LiveSales({
  region,
  ...props
}: Omit<ComponentProps<typeof SalesSection>, 'signals' | 'checked'> & {
  region: Region;
}) {
  const feed = await withTimeout(saleSignalFeed(region).get(), FEED_TIMEOUT_MS, null);
  return (
    <SalesSection
      {...props}
      signals={feed?.data.signals ?? []}
      checked={feed?.data.checked ?? []}
    />
  );
}

export default async function Home() {
  // Rendered once for everyone, so it uses the default marketplace; prices
  // are converted to each visitor's currency in the browser.
  const country = getCountry(DEFAULT_PREFERENCES.country);
  const local = CURRENCIES[country.currency].symbol.trim();

  const [allProducts, stats, localDeals, activeSales, reliability] = await Promise.all([
    getAllProducts(),
    getTrackerStats(),
    getTopDeals(local),
    getActiveSales(),
    getStoreReliability(),
  ]);
  const sales = filterSalesFor(activeSales, country.code);
  const region = regionForCountry(country.code);
  const deals = localDeals.length ? localDeals : await getTopDeals(null);
  const liveStores = reliability.filter((store) => store.status === 'operational').length;

  // Feature the best current deal, else the product with the most recorded history.
  const spotlight =
    deals[0] ??
    [...allProducts].sort(
      (a, b) => (b.priceHistory?.length ?? 0) - (a.priceHistory?.length ?? 0),
    )[0] ??
    null;

  // Products sold in the viewer's country come first; skip ones already shown as deals.
  const dealIds = new Set(deals.map((d) => d._id));
  const products = allProducts
    .filter((p) => !dealIds.has(p._id))
    .sort(
      (a, b) => Number(b.currency.trim() === local) - Number(a.currency.trim() === local),
    );

  return (
    <LiveProvider>
      <HashScroll />
      <Ticker products={products} />

      <section id="track" className="relative scroll-mt-24 overflow-hidden">
        <div
          className="dot-grid absolute inset-0 -z-10 mask-[radial-gradient(ellipse_70%_60%_at_50%_0%,#000_20%,transparent_100%)]"
          aria-hidden
        />
        {/* Horizon glow under the hero. */}
        <div
          className="absolute inset-x-0 bottom-0 -z-10 h-px bg-linear-to-r from-transparent via-accent/50 to-transparent"
          aria-hidden
        />
        <div
          className="absolute inset-x-[15%] -bottom-24 -z-10 h-48 rounded-full bg-accent/15 blur-3xl"
          aria-hidden
        />

        <div className="container relative grid grid-cols-1 items-center gap-16 py-16 lg:grid-cols-[1.1fr_1fr] lg:py-24">
          <div className="flex flex-col items-start">
            <div className="flex flex-wrap items-center gap-2">
              <LiveBadge />
              {liveStores > 0 && (
                <span className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-muted">
                  <span className="num font-semibold text-ink">{liveStores}</span>
                  {liveStores === 1 ? 'store' : 'stores'} reporting live prices
                </span>
              )}
            </div>
            <h1 className="mt-6 text-[clamp(2.4rem,5.2vw,4rem)] font-semibold leading-[1.04] tracking-[-0.035em]">
              Track prices on any store.
              <br />
              <span className="text-gradient">Buy at the right time.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted">
              Search a product to compare live prices on Amazon, Flipkart and more, or
              paste a link from any shop. Get the full price history and an email the
              moment it drops.
            </p>

            <div className="mt-8 w-full max-w-xl">
              <Searchbar />
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted">
              <span>Type it like you&rsquo;d say it:</span>
              {EXAMPLE_SEARCHES.map((example) => (
                <Link
                  key={example}
                  href={`/search?q=${encodeURIComponent(example)}`}
                  className="rounded-full border border-line bg-surface/60 px-2.5 py-1 text-ink/80 transition hover:border-accent/40 hover:text-accent"
                >
                  {example}
                </Link>
              ))}
            </p>

            <dl className="glass mt-8 grid w-full max-w-xl grid-cols-3 divide-x divide-line/70 rounded-2xl">
              {[
                ['Products tracked', stats.products],
                ['Price snapshots', stats.datapoints],
                ['Active watchers', stats.watchers],
              ].map(([label, value]) => (
                <div key={label} className="px-4 py-3.5">
                  <dt className="text-xs text-muted">{label}</dt>
                  <dd className="num glow mt-0.5 text-2xl font-semibold">
                    {formatNumber(Number(value))}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="animate-rise pb-6 [animation-delay:.15s]">
            <HeroVisual product={spotlight} />
          </div>
        </div>
      </section>

      {/* Section order follows the navbar: Track, Deals, Sales, Trending, How it works. */}
      <DealsSection tracked={deals} region={region} />

      <div id="sales" className="scroll-mt-24">
        <Suspense fallback={null}>
          <LiveSales country={country} sales={sales} region={region} />
        </Suspense>
      </div>

      <TrendingSection region={region} />

      {/* Only shown once something is tracked; an empty box helps no one. */}
      {products.length > 0 && (
        <section id="tracked" className="container scroll-mt-24 py-16">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-accent">
                {country.flag} Price-tracked in {country.name}
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                Recently tracked
              </h2>
            </div>
            <p className="hidden text-sm text-muted sm:block">
              Prices re-checked every 30 minutes and updated live.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
            {products.map((product, i) => (
              <div key={product._id} className="reveal">
                <ProductCard product={product} preload={i < 4} />
              </div>
            ))}
          </div>
        </section>
      )}

      <HowItWorks />
      <ReliabilityPanel stores={reliability} />
    </LiveProvider>
  );
}
