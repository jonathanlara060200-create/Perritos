// Service worker mínimo: hace la app instalable.
// A propósito NO cachea nada: el perfil público debe mostrar siempre el estado real
// (por ejemplo, "mascota perdida") y nunca una copia vieja.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {
  // red directa
})
