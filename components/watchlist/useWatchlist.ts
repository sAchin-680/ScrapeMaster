'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { parseIds, serializeIds, toggleId, WATCHLIST_COOKIE } from '@/lib/watchlist';

const EVENT = 'sm-watchlist';

function read() {
  const match = document.cookie.match(new RegExp(`(?:^|; )${WATCHLIST_COOKIE}=([^;]*)`));
  return match?.[1] ?? '';
}

function subscribe(onChange: () => void) {
  // Same-tab saves fire EVENT; other tabs are picked up when this one regains focus.
  window.addEventListener(EVENT, onChange);
  window.addEventListener('focus', onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener('focus', onChange);
  };
}

function write(ids: string[]) {
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${WATCHLIST_COOKIE}=${serializeIds(ids)}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax${secure}`;
  window.dispatchEvent(new Event(EVENT));
}

/** The visitor's saved product ids, kept in a first-party cookie. */
export function useWatchlist() {
  // The raw cookie string is the snapshot: stable between reads, so no extra renders.
  const raw = useSyncExternalStore(subscribe, read, () => '');
  const ids = parseIds(raw);
  const toggle = useCallback((id: string) => write(toggleId(parseIds(read()), id)), []);
  return { ids, has: (id: string) => ids.includes(id), toggle };
}
