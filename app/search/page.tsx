import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Sparkles, X } from 'lucide-react';
import { redirect } from 'next/navigation';
import SearchResults from '@/components/SearchResults';
import Searchbar from '@/components/Searchbar';
import {
  CURRENCIES,
  getCountry,
  regionForCountry,
  SEARCHABLE_STORES,
} from '@/lib/locale';
import { getPreferences } from '@/lib/preferences';
import { parseSearchIntent, type SearchIntent } from '@/lib/search/intent';
import { formatPrice } from '@/lib/utils';

// Room for streamed store data; Vercel Hobby defaults to 10 seconds.
export const maxDuration = 60;

type Props = { searchParams: Promise<{ q?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: q ? `Prices for “${q}”` : 'Search', robots: { index: false } };
}

function filterLabel(filter: SearchIntent['filters'][number], symbol: string) {
  switch (filter.kind) {
    case 'max':
      return `Under ${formatPrice(filter.value, symbol)}`;
    case 'min':
      return `Over ${formatPrice(filter.value, symbol)}`;
    case 'range':
      return `${formatPrice(filter.min, symbol)} – ${formatPrice(filter.max, symbol)}`;
    case 'sort':
      return filter.value === 'price' ? 'Cheapest first' : 'Biggest real discount first';
  }
}

function ResultsSkeleton() {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      aria-busy="true"
      aria-label="Searching stores"
    >
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="skeleton h-72 rounded-xl" />
      ))}
    </div>
  );
}

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = q?.trim().slice(0, 120);
  if (!query) redirect('/');

  const country = getCountry((await getPreferences()).country);
  const intent = parseSearchIntent(query);
  const symbol = CURRENCIES[country.currency].symbol.trim();

  return (
    <div className="container py-10">
      <div className="max-w-2xl">
        <Searchbar defaultValue={query} />
      </div>
      <div className="mb-6 mt-2 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Live prices for “{intent.keywords || query}”
        </h1>
        <p className="text-sm text-muted">
          {country.flag} Searching{' '}
          {SEARCHABLE_STORES[regionForCountry(country.code)].join(' & ')} in real time
        </p>
      </div>
      {intent.filters.length > 0 && (
        <ul
          className="mb-6 flex flex-wrap items-center gap-2"
          aria-label="Understood from your search"
        >
          <li className="inline-flex items-center gap-1.5 text-xs text-muted">
            <Sparkles className="size-3.5 text-accent" aria-hidden /> Understood:
          </li>
          {intent.filters.map((filter) => (
            <li key={filter.kind}>
              <Link
                href={
                  filter.without ? `/search?q=${encodeURIComponent(filter.without)}` : '/'
                }
                className="glass group inline-flex items-center gap-1.5 rounded-full py-1 pl-3 pr-2 text-sm font-medium transition hover:border-accent/40"
                aria-label={`Remove filter: ${filterLabel(filter, symbol)}`}
              >
                {filterLabel(filter, symbol)}
                <X
                  className="size-3.5 text-muted transition group-hover:text-ink"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {intent.keywords ? (
        <Suspense key={query} fallback={<ResultsSkeleton />}>
          <SearchResults intent={intent} region={regionForCountry(country.code)} />
        </Suspense>
      ) : (
        <div className="card px-6 py-16 text-center">
          <h2 className="text-lg font-semibold">What are you looking for?</h2>
          <p className="mt-2 text-sm text-muted">
            Add a product to your search, for example “earbuds {query}”.
          </p>
        </div>
      )}
    </div>
  );
}
