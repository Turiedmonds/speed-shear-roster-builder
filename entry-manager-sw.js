const CACHE_NAME = 'waimarino-entry-manager-offline-v8';

const APP_SHELL = [
  '/manage/',
  '/manage/index.html',
  '/entry-manager.html',
  '/entry-manager.css',
  '/entry-manager-polish.css',
  '/entry-manager-workflow.css',
  '/entry-manager-tidy.css',
  '/entry-countdown.css',
  '/entry-manager-offline.css',
  '/entry-manager-bootstrap.js',
  '/entry-manager-workflow.js',
  '/entry-manager-write-confirmation.js',
  '/entry-manager-offline.js',
  '/entry-manager-reconnect-fast.js',
  '/entry-manager.js',
  '/entry-manager-timing-export.js',
  '/entry-manager-local-pdf.js',
  '/entry-manager-live-refresh.js',
  '/entry-manager-drag-autoscroll.js',
  '/entry-manager-tidy.js',
  '/entry-manager-entry-groups.js',
  '/entry-manager-countdown.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function cacheFallbackFor(request) {
  const url = new URL(request.url);
  if (url.pathname === '/manage' || url.pathname === '/manage/') return '/manage/index.html';
  if (url.pathname === '/entry-manager.html') return '/entry-manager.html';
  return url.pathname;
}

async function fromCache(request) {
  const direct = await caches.match(request, { ignoreSearch: true });
  if (direct) return direct;
  return caches.match(cacheFallbackFor(request), { ignoreSearch: true });
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.searchParams.has('network-probe')) {
    const liveProbeUrl = new URL('/entry-manager.html', self.location.origin);
    liveProbeUrl.searchParams.set('network-probe', url.searchParams.get('network-probe') || String(Date.now()));
    event.respondWith(fetch(liveProbeUrl.toString(), { cache: 'no-store' }));
    return;
  }

  const isManagerNavigation = request.mode === 'navigate' && (
    url.pathname === '/manage' ||
    url.pathname === '/manage/' ||
    url.pathname === '/manage/index.html' ||
    url.pathname === '/entry-manager.html'
  );

  const isManagerAsset = APP_SHELL.some(path => {
    const pathName = new URL(path, self.location.origin).pathname;
    return url.pathname === pathName;
  });

  if (!isManagerNavigation && !isManagerAsset) return;

  event.respondWith((async () => {
    const cached = await fromCache(request);
    if (cached) return cached;

    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone()).catch(() => undefined);
    }
    return response;
  })());
});
