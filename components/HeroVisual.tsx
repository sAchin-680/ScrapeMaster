import Link from 'next/link';
import { ArrowUpRight, BellRing, Search, TrendingDown, TrendingUp } from 'lucide-react';
import LivePrice from '@/components/live/LivePrice';
import RelativeTime from '@/components/live/RelativeTime';
import Money from '@/components/ui/Money';
import ProductImage from '@/components/ui/ProductImage';
import type { Product } from '@/types';
import { getPriceChange, toAreaPath, toPath, toPoints, truncate } from '@/lib/utils';

const W = 340;
const H = 140;

/** Spotlight on a real tracked product: its live price and recorded history. */
export default function HeroVisual({ product }: { product: Product | null }) {
  if (!product) {
    return (
      <div className="glass mx-auto flex w-full max-w-lg flex-col items-center gap-3 rounded-3xl p-10 text-center">
        <span className="grid size-12 place-items-center rounded-xl bg-accent-soft text-accent">
          <Search className="size-6" aria-hidden />
        </span>
        <p className="font-semibold">Your first price chart appears here</p>
        <p className="max-w-xs text-sm text-muted">
          Search for a product above. We read live prices from each store and start
          recording its history.
        </p>
      </div>
    );
  }

  const history = product.priceHistory ?? [];
  const values = history.map((h) => h.price);
  const points = toPoints(values.length ? values : [product.currentPrice], W, H, 10);
  const last = points[points.length - 1];
  const previous =
    history.length > 1 ? history[history.length - 2].price : product.currentPrice;
  const change = getPriceChange(previous, product.currentPrice);
  const stats = [
    ['Lowest', product.lowestPrice],
    ['Average', product.averagePrice],
    ['Highest', product.highestPrice],
  ] as const;

  return (
    <div className="relative mx-auto w-full max-w-lg">
      <div
        className="absolute -inset-8 -z-10 rounded-[3rem] bg-linear-to-tr from-indigo-500/25 via-violet-500/15 to-sky-400/25 blur-3xl"
        aria-hidden
      />

      <Link
        href={`/products/${product._id}`}
        className="glass shine group block rounded-3xl p-6 transition hover:border-accent/40"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-line">
              <ProductImage
                resize={160}
                src={product.image}
                alt=""
                fill
                sizes="48px"
                className="object-contain p-1"
              />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm text-muted">{truncate(product.title, 48)}</p>
              <LivePrice
                productId={product._id}
                price={product.currentPrice}
                currency={product.currency}
                className="glow text-2xl font-semibold"
              />
            </div>
          </div>
          {change !== 0 ? (
            <span
              className={`num inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
                change < 0 ? 'bg-down/10 text-down' : 'bg-up/10 text-up'
              }`}
            >
              {change < 0 ? (
                <TrendingDown className="size-3.5" aria-hidden />
              ) : (
                <TrendingUp className="size-3.5" aria-hidden />
              )}
              {Math.abs(change)}%
            </span>
          ) : (
            <ArrowUpRight
              className="size-5 shrink-0 text-muted transition group-hover:text-ink"
              aria-hidden
            />
          )}
        </div>

        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="mt-6 w-full overflow-visible"
          aria-hidden
        >
          <defs>
            <linearGradient id="hero-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="rgb(var(--accent))" stopOpacity=".26" />
              <stop offset="1" stopColor="rgb(var(--accent))" stopOpacity="0" />
            </linearGradient>
            {/* User-space units: a flat line has a zero-height bounding box,
                which would hide a bounding-box gradient or filter. */}
            <linearGradient
              id="hero-line"
              gradientUnits="userSpaceOnUse"
              x1="0"
              x2={W}
              y1="0"
              y2="0"
            >
              <stop offset="0" stopColor="rgb(var(--accent-3))" />
              <stop offset=".5" stopColor="rgb(var(--accent))" />
              <stop offset="1" stopColor="rgb(var(--accent-2))" />
            </linearGradient>
            <filter
              id="hero-glow"
              filterUnits="userSpaceOnUse"
              x={-20}
              y={-20}
              width={W + 40}
              height={H + 40}
            >
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {[35, 70, 105].map((y) => (
            <line
              key={y}
              x1="0"
              x2={W}
              y1={y}
              y2={y}
              stroke="rgb(var(--line))"
              strokeDasharray="3 5"
            />
          ))}
          <path d={toAreaPath(points, H)} fill="url(#hero-fill)" />
          <path
            d={toPath(points)}
            fill="none"
            stroke="url(#hero-line)"
            strokeWidth="2.5"
            strokeLinecap="round"
            filter="url(#hero-glow)"
            pathLength={1}
            strokeDasharray="1"
            strokeDashoffset="1"
            className="animate-draw"
          />
          <circle
            cx={last.x}
            cy={last.y}
            r="10"
            fill="rgb(var(--accent))"
            opacity=".18"
            className="animate-pulse-dot"
          />
          <circle
            cx={last.x}
            cy={last.y}
            r="4.5"
            fill="rgb(var(--accent))"
            stroke="rgb(var(--surface))"
            strokeWidth="2"
          />
        </svg>

        <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
          {stats.map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl bg-paper/60 px-3 py-2.5 ring-1 ring-line/60"
            >
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="num mt-0.5 font-semibold">
                <Money amount={value} currency={product.currency} />
              </dd>
            </div>
          ))}
        </dl>
      </Link>

      <div className="glass absolute top-[26%] -left-4 flex animate-float items-center gap-3 rounded-2xl p-3 pr-5 sm:-left-12">
        <span className="grid size-9 place-items-center rounded-lg bg-accent-soft text-accent">
          <BellRing className="size-4" aria-hidden />
        </span>
        <div className="text-sm">
          <p className="font-medium">
            {history.length} price {history.length === 1 ? 'check' : 'checks'} on{' '}
            {product.storeName}
          </p>
          <p className="text-xs text-muted">
            Last checked{' '}
            {product.updatedAt ? (
              <RelativeTime date={product.updatedAt} productId={product._id} />
            ) : (
              'recently'
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
