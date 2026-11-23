import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft, Star } from 'lucide-react';
import DealBadge from '@/components/DealBadge';
import LivePrice from '@/components/live/LivePrice';
import { LiveProvider } from '@/components/live/LiveProvider';
import Money from '@/components/ui/Money';
import ProductImage from '@/components/ui/ProductImage';
import StoreLogo from '@/components/ui/StoreLogo';
import { getSaleEvents, outlookFor } from '@/lib/data/outlook';
import { getProductsByIds } from '@/lib/data/products';
import { getDealVerdict } from '@/lib/deal';
import { cn, formatNumber } from '@/lib/utils';
import { COMPARE_LIMIT, parseIds } from '@/lib/watchlist';
import type { Product } from '@/types';

export const metadata: Metadata = {
  title: 'Compare',
  description: 'Saved products side by side: price, history and outlook.',
  robots: { index: false },
};

type Props = { searchParams: Promise<{ ids?: string }> };

/**
 * Rating weighted by how many reviews back it (a Bayesian average): a 5.0 from
 * one review should not beat a 4.0 from fifty thousand. Ratings are pulled
 * toward a typical 3.5 until about 50 reviews support them.
 */
function weightedRating(stars: number, reviews: number) {
  if (stars <= 0) return 0;
  const prior = 3.5;
  const weight = 50;
  return (prior * weight + stars * reviews) / (weight + reviews);
}

/** Index of the best value in a row, or -1 when there is nothing to pick between. */
function best(values: number[], pick: 'min' | 'max') {
  const valid = values.filter((v) => v > 0);
  if (valid.length < 2 || new Set(valid).size === 1) return -1;
  const target = pick === 'min' ? Math.min(...valid) : Math.max(...valid);
  return values.indexOf(target);
}

function Row({
  label,
  cells,
  highlight = -1,
}: {
  label: string;
  cells: ReactNode[];
  highlight?: number;
}) {
  return (
    <tr className="border-t border-line/70">
      <th scope="row" className="py-3 pr-4 text-left text-xs font-medium text-muted">
        {label}
      </th>
      {cells.map((cell, i) => (
        <td
          key={i}
          className={cn(
            'px-3 py-3 align-top text-sm',
            i === highlight && 'rounded-lg bg-down/[0.08] font-semibold text-down',
          )}
        >
          {cell}
        </td>
      ))}
    </tr>
  );
}

export default async function ComparePage({ searchParams }: Props) {
  const { ids } = await searchParams;
  const products = await getProductsByIds(parseIds(ids, COMPARE_LIMIT));

  if (products.length < 2) {
    return (
      <div className="container py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Pick products to compare
        </h1>
        <p className="mt-2 text-muted">
          Choose two to four saved products on your watchlist.
        </p>
        <Link href="/watchlist" className="btn-accent mt-6">
          Go to watchlist
        </Link>
      </div>
    );
  }

  const sales = await getSaleEvents(products[0].currency);
  const rows = products.map((product: Product) => ({
    product,
    verdict: getDealVerdict({ ...product, priceHistory: product.priceHistory ?? [] }),
    outlook: outlookFor(product, sales),
  }));
  const prices = products.map((p) => p.currentPrice);

  return (
    <LiveProvider productIds={products.map((p) => p._id)}>
      <div className="container py-10 lg:py-14">
        <Link
          href="/watchlist"
          className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden /> Watchlist
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
          Side by side
        </h1>
        <p className="mt-2 text-muted">
          Best value in each row is highlighted. Prices update live.
        </p>

        {/* Wide comparisons scroll inside this panel, never the page. */}
        <div className="glass mt-8 overflow-x-auto rounded-3xl p-4 sm:p-6">
          <table className="w-full min-w-[40rem] table-fixed border-separate border-spacing-0">
            <caption className="sr-only">Product comparison</caption>
            <colgroup>
              <col className="w-32" />
            </colgroup>
            <thead>
              <tr>
                <td />
                {rows.map(({ product }) => (
                  <th
                    key={product._id}
                    scope="col"
                    className="px-3 pb-4 text-left align-top"
                  >
                    <Link href={`/products/${product._id}`} className="group block">
                      <span className="relative block size-28 overflow-hidden rounded-xl bg-white sm:size-36">
                        <ProductImage
                          resize={300}
                          src={product.image}
                          alt=""
                          fill
                          sizes="144px"
                          className="object-contain p-3"
                        />
                      </span>
                      <span className="mt-3 line-clamp-3 text-sm font-medium leading-snug transition-colors group-hover:text-accent">
                        {product.title}
                      </span>
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <Row
                label="Price now"
                highlight={best(prices, 'min')}
                cells={rows.map(({ product }) => (
                  <LivePrice
                    key={product._id}
                    productId={product._id}
                    price={product.currentPrice}
                    currency={product.currency}
                    className="text-lg font-semibold"
                  />
                ))}
              />
              <Row
                label="Store"
                cells={rows.map(({ product }) => (
                  <span key={product._id} className="inline-flex items-center gap-2">
                    <StoreLogo
                      url={product.url}
                      name={product.storeName}
                      className="size-6"
                    />
                    {product.storeName}
                  </span>
                ))}
              />
              <Row
                label="Deal"
                highlight={best(
                  rows.map((r) => (r.verdict.level === 'new' ? 0 : r.verdict.score)),
                  'max',
                )}
                cells={rows.map(({ product, verdict }) => (
                  <DealBadge key={product._id} verdict={verdict} />
                ))}
              />
              <Row
                label="Outlook"
                cells={rows.map(({ product, outlook }) => (
                  <span key={product._id}>
                    {outlook ? (
                      <>
                        <span className="font-medium text-ink">{outlook.headline}</span>
                        <span className="mt-0.5 block text-xs text-muted">
                          {outlook.reasons[0]}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted">Collecting data</span>
                    )}
                  </span>
                ))}
              />
              <Row
                label="Lowest recorded"
                highlight={best(
                  products.map((p) => p.lowestPrice),
                  'min',
                )}
                cells={products.map((p) => (
                  <Money key={p._id} amount={p.lowestPrice} currency={p.currency} />
                ))}
              />
              <Row
                label="Average"
                cells={products.map((p) => (
                  <Money key={p._id} amount={p.averagePrice} currency={p.currency} />
                ))}
              />
              <Row
                label="Highest recorded"
                cells={products.map((p) => (
                  <Money key={p._id} amount={p.highestPrice} currency={p.currency} />
                ))}
              />
              <Row
                label="Rating"
                highlight={best(
                  products.map((p) => weightedRating(p.stars, p.reviewsCount)),
                  'max',
                )}
                cells={products.map((p) =>
                  p.stars > 0 ? (
                    <span key={p._id} className="inline-flex items-center gap-1">
                      <Star
                        className="size-3.5 fill-amber-400 text-amber-400"
                        aria-hidden
                      />
                      {p.stars.toFixed(1)}
                      {p.reviewsCount > 0 && (
                        <span className="text-xs font-normal text-muted">
                          ({formatNumber(p.reviewsCount)})
                        </span>
                      )}
                    </span>
                  ) : (
                    <span key={p._id} className="text-muted">
                      None
                    </span>
                  ),
                )}
              />
              <Row
                label="Price checks"
                cells={products.map((p) => (
                  <span key={p._id} className="num">
                    {p.priceHistory?.length ?? 0}
                  </span>
                ))}
              />
            </tbody>
          </table>
        </div>
      </div>
    </LiveProvider>
  );
}
