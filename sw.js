const CACHE_NAME = 'lexus-tracker-v7';
const ASSETS = [
  './Dashboard.html', './settings.html', './archive.html',
  './app.js', './manifest.json', './tailwind.css', './style.css',
  './icon-192.png', './icon-512.png', './apple-touch-icon.png',
  './badge.png', './notif-image.jpg',
  './theme.css',
  './sc-hours.png', './sc-taxi.png', './sc-gas.png', './sc-lease.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => cached))
  );
});

// === NOTIFICATION CLICK ===
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || './Dashboard.html';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      // Якщо додаток вже відкритий — фокусуємо
      for (const client of list) {
        if (client.url.includes('Dashboard') && 'focus' in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});

// === MESSAGE від app.js — показати нотифікацію з SW ===
self.addEventListener('message', e => {
  if (e.data?.type === 'SHOW_NOTIFICATION') {
    const { title, options } = e.data;
    self.registration.showNotification(title, options);
  }
});
