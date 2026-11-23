'use client';

import { useEffect, useState } from 'react';
import type { ProductSuggestion } from '@/lib/data/products';

export type Suggestions = { queries: string[]; products: ProductSuggestion[] };

const EMPTY: Suggestions = { queries: [], products: [] };
const DEBOUNCE_MS = 150;

/** Debounced suggestions for a partial query; stale requests are cancelled. */
export function useSuggestions(query: string, country: string, enabled: boolean) {
  const term = query.trim();
  const active = enabled && term.length >= 2 && !/^https?:\/\//i.test(term);
  const key = `${country}:${term}`;
  // Results remember which query they answer; anything older means loading.
  const [result, setResult] = useState({ key: '', data: EMPTY });

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      let next: Suggestions | null = null;
      try {
        const params = new URLSearchParams({ q: term, country });
        const response = await fetch(`/api/suggest?${params}`, {
          signal: controller.signal,
        });
        if (response.ok) next = await response.json();
      } catch {
        // Offline: keep the previous suggestions. Aborted: a newer query owns it.
      }
      if (controller.signal.aborted) return;
      setResult((previous) => ({ key, data: next ?? previous.data }));
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [active, key, term, country]);

  return {
    ...(active ? result.data : EMPTY),
    loading: active && result.key !== key,
  };
}
