import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { Bookmark } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import { LiveProvider } from '@/components/live/LiveProvider';
import { CompareProvider, WatchlistItem } from '@/components/watchlist/Compare';
import { getProductsByIds } from '@/lib/data/products';
import { parseIds, WATCHLIST_COOKIE } from '@/lib/watchlist';

export const metadata: Metadata = {
  title: 'Watchlist',
  description: 'Products you saved, with live prices.',
  robots: { index: false },
};

export default async function WatchlistPage() {
  const ids = parseIds((await cookies()).get(WATCHLIST_COOKIE)?.value);
  const products = await getProductsByIds(ids);

  return (
    <div className="container py-10 lg:py-14">
      <p className="kicker">Your watchlist</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
        Saved products
      </h1>
      <p className="mt-2 max-w-xl text-muted">
        Saved in this browser only, with no account needed. Prices update live. Tick two
        to four products to compare them side by side.
      </p>

      {products.length === 0 ? (
        <div className="glass mt-10 flex flex-col items-center rounded-3xl px-6 py-16 text-center">
          <span className="grid size-12 place-items-center rounded-xl bg-accent-soft text-accent">
            <Bookmark className="size-6" aria-hidden />
          </span>
          <h2 className="mt-4 text-lg font-semibold">Nothing saved yet</h2>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Tap the bookmark on any tracked product to keep an eye on its price here.
          </p>
          <Link href="/#deals" className="btn-accent mt-6">
            Browse today’s deals
          </Link>
        </div>
      ) : (
        <LiveProvider productIds={products.map((p) => p._id)}>
          <CompareProvider>
            <ul className="mt-8 grid grid-cols-2 gap-3 pb-24 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
              {products.map((product, i) => (
                <WatchlistItem key={product._id} id={product._id}>
                  <ProductCard product={product} preload={i < 4} />
                </WatchlistItem>
              ))}
            </ul>
          </CompareProvider>
        </LiveProvider>
      )}
    </div>
  );
}
