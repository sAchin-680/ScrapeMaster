'use client';

import Link from 'next/link';
import {
  createContext,
  useContext,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { ArrowRight, Columns3 } from 'lucide-react';
import { COMPARE_LIMIT } from '@/lib/watchlist';
import { cn } from '@/lib/utils';
import { useWatchlist } from './useWatchlist';

type Selection = { selected: string[]; toggle: (id: string) => void };
const CompareContext = createContext<Selection>({ selected: [], toggle: () => {} });

const noop = () => () => {};
/** False during server render and hydration, true afterwards. */
const useHydrated = () =>
  useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

/** Holds the products picked for comparison on the watchlist page. */
export function CompareProvider({ children }: { children: ReactNode }) {
  const [picked, setPicked] = useState<string[]>([]);
  const { ids } = useWatchlist();
  const hydrated = useHydrated();
  // Unsaved products drop out of the selection too.
  const selected = hydrated ? picked.filter((id) => ids.includes(id)) : picked;
  const toggle = (id: string) =>
    setPicked((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : current.length < COMPARE_LIMIT
          ? [...current, id]
          : current,
    );
  return (
    <CompareContext.Provider value={{ selected, toggle }}>
      {children}
      <CompareBar />
    </CompareContext.Provider>
  );
}

/**
 * A saved product's card with its compare checkbox. Once the page has
 * hydrated, products removed from the watchlist disappear straight away.
 */
export function WatchlistItem({ id, children }: { id: string; children: ReactNode }) {
  const { has } = useWatchlist();
  const { selected, toggle } = useContext(CompareContext);
  const hydrated = useHydrated();
  if (hydrated && !has(id)) return null;

  const checked = selected.includes(id);
  const full = !checked && selected.length >= COMPARE_LIMIT;
  return (
    <li className="flex flex-col gap-2">
      {children}
      <label
        className={cn(
          'inline-flex items-center gap-2 self-start rounded-lg px-2 py-1 text-sm transition',
          full
            ? 'cursor-not-allowed text-muted/60'
            : 'cursor-pointer text-muted hover:text-ink',
        )}
        title={full ? `Compare up to ${COMPARE_LIMIT} products at a time` : undefined}
      >
        <input
          type="checkbox"
          className="size-4 accent-[rgb(var(--accent))]"
          checked={checked}
          disabled={full}
          onChange={() => toggle(id)}
        />
        Compare
      </label>
    </li>
  );
}

function CompareBar() {
  const { selected } = useContext(CompareContext);
  if (!selected.length) return null;
  const ready = selected.length >= 2;

  return (
    <div
      className="fixed inset-x-0 bottom-4 z-40 px-4"
      role="region"
      aria-label="Compare"
    >
      <div className="glass-solid mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl p-2 pl-4">
        <p className="flex items-center gap-2 text-sm">
          <Columns3 className="size-4 text-accent" aria-hidden />
          <span>
            <span className="num font-semibold">{selected.length}</span> of{' '}
            {COMPARE_LIMIT} selected
            {!ready && <span className="text-muted"> · pick one more</span>}
          </span>
        </p>
        {ready ? (
          <Link href={`/compare?ids=${selected.join(',')}`} className="btn-accent">
            Compare <ArrowRight className="size-4" aria-hidden />
          </Link>
        ) : (
          <span className="btn-ghost pointer-events-none opacity-50" aria-disabled>
            Compare
          </span>
        )}
      </div>
    </div>
  );
}
