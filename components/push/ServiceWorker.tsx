'use client';

import { useEffect } from 'react';

/** Registers the service worker that makes the site installable. */
export default function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Not fatal: the site works the same, just not installable.
    });
  }, []);
  return null;
}
