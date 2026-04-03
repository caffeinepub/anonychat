self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Vault777';
  const options = {
    body: data.body || 'Yeni bildirim',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/', contactId: data.contactId },
    actions: [
      { action: 'reply', title: 'Yanıtla' },
      { action: 'dismiss', title: 'Kapat' }
    ],
    requireInteraction: false,
    tag: data.contactId || 'anonchat'
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  const action = event.action;
  const notification = event.notification;
  notification.close();

  if (action === 'dismiss') return;

  const url = notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'NOTIFICATION_CLICK', contactId: notification.data?.contactId });
          return;
        }
      }
      return clients.openWindow(url);
    })
  );
});

self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));
