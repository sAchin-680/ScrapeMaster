'use client';

import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Megaphone, X } from 'lucide-react';

export type Announcement = { id: string; text: string; href?: string; cta?: string };

const STORAGE_KEY = 'sm_announcements_dismissed';

function subscribeToStorage(onChange: () => void) {
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
}

function readDismissed() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage can be unavailable (private mode); the bar just stays visible.
    return null;
  }
}

/** Slim rotating bar for live sales and smart-shopping tips. */
export default function AnnouncementBar({ items }: { items: Announcement[] }) {
  const [index, setIndex] = useState(0);
  const [dismissedNow, setDismissedNow] = useState(false);
  const signature = items.map((i) => i.id).join('|');
  const dismissed = useSyncExternalStore(subscribeToStorage, readDismissed, () => null);
  const hidden = dismissedNow || dismissed === signature;

  useEffect(() => {
    if (items.length < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % items.length), 6_000);
    return () => clearInterval(timer);
  }, [items.length]);

  if (hidden || !items.length) return null;
  const item = items[index];

  const dismiss = () => {
    setDismissedNow(true);
    try {
      localStorage.setItem(STORAGE_KEY, signature);
    } catch {}
  };

  return (
    <div className="relative bg-linear-to-r from-indigo-600 via-violet-600 to-indigo-600 text-white">
      <div className="container flex min-h-10 items-center justify-center gap-2 py-2 pr-10 text-center text-[13px]">
        <Megaphone className="hidden size-4 shrink-0 opacity-80 sm:block" aria-hidden />
        <p key={item.id} className="animate-rise" aria-live="polite">
          {item.text}
          {item.href && (
            <Link
              href={item.href}
              className="ml-2 font-semibold underline underline-offset-2 hover:opacity-80"
            >
              {item.cta ?? 'Learn more'}
            </Link>
          )}
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md opacity-80 transition hover:bg-white/10 hover:opacity-100"
        aria-label="Dismiss announcements"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
