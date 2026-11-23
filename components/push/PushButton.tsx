'use client';

import { useState, useSyncExternalStore } from 'react';
import { BellOff, BellRing, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const STORAGE_KEY = 'sm_push_products';
const EVENT = 'sm-push';

function supported() {
  return (
    Boolean(PUBLIC_KEY) &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

function readFollowed() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function writeFollowed(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, ids.join(','));
  } catch {
    // Storage unavailable: the subscription still works, only the label won't persist.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

function keyBytes(base64url: string) {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

async function pushSubscription() {
  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;
  // Some browsers never answer when their push service is unreachable; give up
  // after a while instead of spinning forever.
  return Promise.race([
    registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(PUBLIC_KEY!),
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('push service timeout')), 20_000),
    ),
  ]);
}

/** Price alerts on this device through Web Push; hidden where it can't work. */
export default function PushButton({ productId }: { productId: string }) {
  const isSupported = useSyncExternalStore(
    () => () => {},
    supported,
    () => false,
  );
  const followed = useSyncExternalStore(subscribe, readFollowed, () => '')
    .split(',')
    .includes(productId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!isSupported) return null;

  const toggle = async () => {
    setBusy(true);
    setError('');
    try {
      const ids = readFollowed().split(',').filter(Boolean);
      if (followed) {
        const subscription = await (
          await navigator.serviceWorker.ready
        ).pushManager.getSubscription();
        if (subscription) {
          await fetch('/api/push', {
            method: 'DELETE',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ endpoint: subscription.endpoint, productId }),
          });
        }
        writeFollowed(ids.filter((id) => id !== productId));
        return;
      }
      if ((await Notification.requestPermission()) !== 'granted') {
        setError('Notifications are blocked in your browser settings.');
        return;
      }
      const subscription = await pushSubscription();
      const response = await fetch('/api/push', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ productId, subscription: subscription.toJSON() }),
      });
      if (!response.ok) throw new Error(String(response.status));
      writeFollowed([...ids, productId]);
    } catch (error) {
      setError(
        error instanceof Error && error.message === 'push service timeout'
          ? 'Your browser’s push service did not respond. Try again later.'
          : 'Could not turn on notifications. Try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  const Icon = busy ? Loader2 : followed ? BellOff : BellRing;
  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={followed}
        className={cn('btn-ghost px-3 py-2 text-sm', followed && 'text-accent')}
      >
        <Icon className={cn('size-4', busy && 'animate-spin')} aria-hidden />
        {followed ? 'Notifying' : 'Notify me'}
      </button>
      {error && (
        <p className="text-xs text-up" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
