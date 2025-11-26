self.addEventListener('fetch', (event) => {
  // Simple passthrough for now to prevent errors if not configured
  // event.respondWith(fetch(event.request));
});