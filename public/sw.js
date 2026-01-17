// Service Worker for halohome.app PWA
// Cache version is auto-updated on each build via vite plugin
const CACHE_VERSION = '__BUILD_TIMESTAMP__';
const CACHE_NAME = `astrocartography-v${CACHE_VERSION}`;

// Assets to precache (minimal - let network handle JS chunks)
const STATIC_ASSETS = [
  '/',
  '/manifest.json'
];

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff

// Fetch with retry logic
async function fetchWithRetry(request, retries = MAX_RETRIES) {
  let lastError;

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(request.clone());
      if (response.ok) {
        return response;
      }
      // For non-ok responses, throw to trigger retry
      if (response.status >= 500) {
        throw new Error(`Server error: ${response.status}`);
      }
      // For 4xx errors, don't retry (client error)
      return response;
    } catch (error) {
      lastError = error;
      console.log(`[SW] Fetch attempt ${i + 1} failed for ${request.url}: ${error.message}`);

      // Wait before retry (except on last attempt)
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[i] || 4000));
      }
    }
  }

  throw lastError;
}

// Install event - cache static assets and activate immediately
self.addEventListener('install', (event) => {
  console.log(`[SW] Installing new version: ${CACHE_VERSION}`);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Use cache: 'reload' to bypass browser HTTP cache and get fresh assets
        // This ensures we don't precache stale index.html after deploys
        return Promise.all(
          STATIC_ASSETS.map(async (url) => {
            const response = await fetch(url, { cache: 'reload' });
            if (response.ok) {
              await cache.put(url, response);
            }
          })
        );
      })
      .then(() => {
        console.log(`[SW] Precached static assets (cache bypassed)`);
      })
  );
  // Skip waiting - activate immediately without waiting for old SW to release
  self.skipWaiting();
});

// Activate event - aggressively clean up ALL old caches
self.addEventListener('activate', (event) => {
  console.log(`[SW] Activating version: ${CACHE_VERSION}`);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log(`[SW] Deleting old cache: ${name}`);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log(`[SW] Old caches cleared, taking control of clients`);
      // Take control of all clients immediately
      return self.clients.claim();
    }).then(() => {
      // Notify all clients that a new version is active
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SW_UPDATED',
            version: CACHE_VERSION
          });
        });
      });
    })
  );
});

// Message handler for forced updates from client
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    console.log('[SW] Received SKIP_WAITING, activating now');
    self.skipWaiting();
  }

  if (event.data === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }

  if (event.data === 'CLEAR_ALL_CACHES') {
    console.log('[SW] Clearing all caches on request');
    caches.keys().then((names) => {
      names.forEach((name) => caches.delete(name));
    });
  }
});

// Fetch event - network first with retry, NO caching of JS chunks
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;

  // Skip API calls, external resources, and dynamic content
  const url = new URL(event.request.url);
  if (url.pathname.includes('/api/') ||
      url.pathname.includes('/supabase/') ||
      event.request.url.includes('googleapis.com') ||
      event.request.url.includes('supabase') ||
      event.request.url.includes('maptiler')) {
    return;
  }

  // For JS/CSS/WASM assets - network only with retry, NO SW caching
  // These have content hashes in filenames - browser/CDN caching handles them
  // Caching them in SW causes stale chunk issues on deploys
  const isHashedAsset = url.pathname.startsWith('/assets/') &&
    (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.wasm'));

  if (isHashedAsset) {
    event.respondWith(
      fetchWithRetry(event.request)
        .catch((error) => {
          console.error(`[SW] Failed to fetch asset after retries: ${url.pathname}`, error);
          // Return error response instead of stale cache
          return new Response(
            `Failed to load: ${url.pathname}`,
            { status: 503, statusText: 'Service Unavailable' }
          );
        })
    );
    return;
  }

  // For other resources (HTML, images, fonts) - network first with cache fallback
  event.respondWith(
    fetchWithRetry(event.request)
      .then((response) => {
        // Only cache successful responses
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed after retries - try cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // For navigation requests, return cached index for SPA routing
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});
