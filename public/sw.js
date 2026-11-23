// ScrapeMaster service worker: makes the site installable and shows price
// alerts sent with Web Push. It does not cache pages, so prices are never stale.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'ScrapeMaster', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      image: data.image,
      tag: data.tag,
      data: { url: data.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // Only ever open pages on this site.
  let url = new URL(
    (event.notification.data && event.notification.data.url) || '/',
    self.location.origin,
  );
  if (url.origin !== self.location.origin) url = new URL('/', self.location.origin);
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windows) => {
        const open = windows.find((w) => w.url === url.href);
        return open ? open.focus() : self.clients.openWindow(url.href);
      }),
  );
});
