self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('app-cache').then(cache =>
      cache.addAll(['/', '/insights'])
    )
  );
});