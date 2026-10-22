/* Public files only. No authenticated API response is intercepted or stored. */
export function installPublicCache(scope, revision, files) {
  const prefix = 'studentos-public-', name = prefix + revision;
  const isPublic = url => url.origin === scope.location.origin && !url.search &&
    (/^\/(assets|fonts|brands|avatars|learning|icons)\//.test(url.pathname) || url.pathname === '/favicon.svg');
  const storeResponse = async (cache, key, response) => {
    const path = typeof key === 'string' ? key : new URL(key.url).pathname;
    const type = response.headers.get('content-type') || '';
    const mismatched = /\.(js|css|json)$/.test(path) && !type.includes(path.endsWith('.js') ? 'javascript' : path.endsWith('.css') ? 'text/css' : 'application/json');
    if (response.ok && !mismatched && response.type !== 'opaque' && !response.headers.has('set-cookie')) {
      try { await cache.put(key, response.clone()); } catch { /* A full cache must never break navigation. */ }
    }
    return response;
  };
  scope.addEventListener('install', event => event.waitUntil((async () => {
    const cache = await scope.caches.open(name);
    // Install the shell first; optional images are warmed later without blocking activation.
    const response = await scope.fetch('/index.html', { cache: 'reload', credentials: 'omit' });
    if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) throw new Error('App shell unavailable');
    await cache.put('/index.html', response);
  })()));
  let warming;
  async function warm() {
    const cache = await scope.caches.open(name), pending = files.filter(path => path !== '/index.html');
    await Promise.all(Array.from({ length: 3 }, async () => {
      while (pending.length) {
        const path = pending.shift();
        if (await cache.match(path)) continue;
        try { await storeResponse(cache, path, await scope.fetch(path, { credentials: 'omit', signal: AbortSignal.timeout(12000) })); } catch {}
      }
    }));
  }
  scope.addEventListener('activate', event => event.waitUntil((async () => {
    try {
      const keys = (await scope.caches.keys()).filter(key => key.startsWith(prefix));
      // Keep the previous release so open tabs can still load their original route chunks.
      const obsolete = keys.filter(key => key !== name).slice(0, -1);
      await Promise.all(obsolete.map(key => scope.caches.delete(key)));
    } catch {}
    await scope.clients.claim();
  })()));
  scope.addEventListener('message', event => {
    if (event.data?.type === 'ACTIVATE_UPDATE') event.waitUntil(scope.skipWaiting());
    if (event.data?.type === 'WARM_PUBLIC_FILES') event.waitUntil(warming ||= warm().catch(() => {}).finally(() => { warming = null; }));
  });
  scope.addEventListener('fetch', event => {
    const request = event.request, url = new URL(request.url);
    if (request.method !== 'GET' || url.origin !== scope.location.origin || url.pathname.startsWith('/api/')) return;
    if (request.mode === 'navigate' && !url.pathname.includes('.') && !url.pathname.startsWith('/assessment-kits/')) {
      event.respondWith((async () => {
        try {
          const response = await scope.fetch(request, { signal: AbortSignal.timeout(4000) });
          if (response.ok) return response;
          if (response.status < 500) return response;
        } catch {}
        try {
          const shell = await (await scope.caches.open(name)).match('/index.html');
          if (shell) return shell;
        } catch {}
        return scope.fetch(request);
      })());
    } else if (isPublic(url)) {
      event.respondWith((async () => {
        let cache;
        try {
          cache = await scope.caches.open(name);
          const hit = await cache.match(request);
          if (hit) return hit;
          // Existing tabs can still use the preceding release's immutable assets.
          if (url.pathname.startsWith('/assets/')) {
            const older = await scope.caches.match(request);
            if (older) return older;
          }
        } catch {}
        const response = await scope.fetch(request);
        return cache ? storeResponse(cache, request, response) : response;
      })());
    }
  });
}
