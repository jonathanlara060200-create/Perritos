// Service worker mínimo: hace la app instalable.
// A propósito NO cachea nada: el perfil público debe mostrar siempre el estado real
// (por ejemplo, "mascota perdida") y nunca una copia vieja.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {
  // red directa
})

// ---- Hidratación: notificaciones push ----
self.addEventListener('push', (event) => {
  let d = {}
  try { d = event.data ? event.data.json() : {} } catch { d = { body: event.data ? event.data.text() : '' } }
  event.waitUntil(
    self.registration.showNotification(d.title || '💧 Hidratación', {
      body: d.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: d.tag || 'hyd',
      data: { url: d.url || '/hidratacion/dashboard' },
    }),
  )
})
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/hidratacion/dashboard'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ('focus' in c) { c.navigate(url); return c.focus() } }
      return self.clients.openWindow(url)
    }),
  )
})
