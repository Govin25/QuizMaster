// Cache version - MUST be updated with every deployment
// Use Date.now() during runtime to ensure unique cache on each build
const CACHE_VERSION = '20251218-mjc30jkd';  // Update this with each deployment
const CACHE_NAME = `quainy-${CACHE_VERSION}`;
const API_CACHE_NAME = `quainy-api-${CACHE_VERSION}`;

// Assets to cache on install (minimal - only offline fallback)
const STATIC_ASSETS = [
    '/offline.html'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing version:', CACHE_VERSION);
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                // Force activation immediately - don't wait for old SW to stop
                console.log('[Service Worker] Skip waiting and activate immediately');
                return self.skipWaiting();
            })
    );
});

// Activate event - clean up ALL old caches aggressively
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating version:', CACHE_VERSION);
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Delete ANY cache that doesn't match current version
                    if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Take control of all clients immediately
            console.log('[Service Worker] Claiming all clients');
            return self.clients.claim();
        }).then(() => {
            // Notify all clients that a new version is active
            return self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION });
                });
            });
        })
    );
});

// Fetch event - Network-first for all assets to ensure freshness
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip WebSocket connections
    if (url.protocol === 'ws:' || url.protocol === 'wss:') {
        return;
    }

    // Skip chrome-extension and other non-http(s) requests
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // CRITICAL: Bypass service worker entirely for auth endpoints
    if (url.pathname.startsWith('/api/auth/')) {
        return;
    }

    // For navigation requests - network first with offline fallback
    if (request.mode === 'navigate') {
        event.respondWith(networkFirstWithOffline(request));
        return;
    }

    // For API requests - network first, cache as fallback
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirstStrategy(request));
        return;
    }

    // For JS/CSS/Assets - stale-while-revalidate (serve cache but always fetch new)
    if (isAssetRequest(url)) {
        event.respondWith(staleWhileRevalidate(request));
        return;
    }

    // For everything else - network first
    event.respondWith(networkFirstStrategy(request));
});

/**
 * Check if request is for a build asset (JS, CSS, images, fonts)
 */
function isAssetRequest(url) {
    const assetExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.woff', '.woff2', '.ttf'];
    return assetExtensions.some(ext => url.pathname.endsWith(ext));
}

/**
 * Stale-while-revalidate: Return cached version immediately, but always fetch fresh
 * Best for assets that change with deployments
 */
async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_NAME);

    // Start network fetch immediately (don't wait)
    const networkPromise = fetch(request).then(response => {
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    }).catch(error => {
        console.log('[Service Worker] Network failed for asset:', request.url);
        return null;
    });

    // Check cache
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
        // Return cached version immediately, network fetch continues in background
        return cachedResponse;
    }

    // No cache, wait for network
    const networkResponse = await networkPromise;
    if (networkResponse) {
        return networkResponse;
    }

    throw new Error('No cached or network response available');
}

/**
 * Network-first for navigation - with offline fallback
 */
async function networkFirstWithOffline(request) {
    try {
        const networkResponse = await fetch(request);

        // Cache successful navigation responses
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.log('[Service Worker] Network failed for navigation, trying cache');

        // Try cache first
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request);

        if (cachedResponse) {
            return cachedResponse;
        }

        // Fallback to offline page
        return cache.match('/offline.html');
    }
}

/**
 * Network-first strategy for API calls
 */
async function networkFirstStrategy(request) {
    const url = new URL(request.url);

    try {
        const networkResponse = await fetch(request);

        // NEVER cache auth or session-related endpoints
        const isAuthRelated = url.pathname.includes('/auth/') ||
            url.pathname.includes('/verify') ||
            url.pathname.includes('/session');

        // Cache successful GET requests (except auth-related)
        if (networkResponse.ok && request.method === 'GET' && !isAuthRelated) {
            const cache = await caches.open(API_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.log('[Service Worker] Network failed, trying cache:', request.url);

        // Try to serve from cache
        const cache = await caches.open(API_CACHE_NAME);
        const cachedResponse = await cache.match(request);

        if (cachedResponse) {
            return cachedResponse;
        }

        throw error;
    }
}

// Listen for messages from the client
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('[Service Worker] Received SKIP_WAITING message');
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CLEAR_CACHE') {
        console.log('[Service Worker] Received CLEAR_CACHE message');
        event.waitUntil(
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => caches.delete(cacheName))
                );
            })
        );
    }

    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_VERSION });
    }
});
