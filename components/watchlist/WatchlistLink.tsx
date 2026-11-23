'use client';

import Link from 'next/link';
import { Bookmark } from 'lucide-react';
import { useWatchlist } from './useWatchlist';

/** Navbar link to the watchlist with a count of saved products. */
export default function WatchlistLink() {
  const { ids } = useWatchlist();
  const count = ids.length;

  return (
    <Link
      href="/watchlist"
      className="relative grid size-9 place-items-center rounded-lg text-muted transition hover:bg-accent/[0.07] hover:text-ink"
      aria-label={count ? `Watchlist, ${count} saved` : 'Watchlist'}
      title="Watchlist"
    >
      <Bookmark className="size-[18px]" aria-hidden />
      {count > 0 && (
        <span className="num absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold leading-4 text-accent-ink">
          {count}
        </span>
      )}
    </Link>
  );
}
