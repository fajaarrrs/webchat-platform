/* eslint-disable no-undef */
// Service Worker for handling push notifications

self.addEventListener('push', event => {
  if (!event.data) {
    console.log('Push notification received but no data');
    return;
  }

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = {
      title: 'Notification',
      body: event.data.text()
    };
  }

  const options = {
    body: payload.body,
    icon: payload.icon || '/webcare-logo.webp',
    badge: payload.badge || '/webcare-logo.webp',
    tag: payload.tag || 'notification',
    data: payload.data || {}
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(clientList => {
      // Check if there's already a window/tab open with the target URL
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window/tab with the target URL
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('notificationclose', event => {
  console.log('Notification closed:', event.notification.tag);
});
