// Nome do cache
const CACHE_NAME = 'agenda-aulas-v1';

// Evento de instalação do Service Worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Evento de ativação
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Intercepta as requisições para garantir que passem direto para o Render
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});