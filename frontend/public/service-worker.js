self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const title = data.title || 'RoomSetu';
      const options = {
        body: data.body || 'You have a new notification.',
        icon: '/favicon.svg',
        data: data.data || { url: '/' }
      };
      event.waitUntil(self.registration.showNotification(title, options));
    } catch (e) {
      event.waitUntil(self.registration.showNotification('RoomSetu', {
        body: event.data.text() || 'New notification',
        icon: '/favicon.svg'
      }));
    }
  } else {
    event.waitUntil(self.registration.showNotification('RoomSetu', {
      body: 'You have a new notification.',
      icon: '/favicon.svg'
    }));
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
