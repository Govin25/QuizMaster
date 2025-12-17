// Service Worker Registration and Management

let deferredPrompt = null;
let swRegistration = null;

/**
 * Register the service worker with aggressive update checking
 */
export async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/service-worker.js', {
                scope: '/',
                // Don't use cached script - always check for updates
                updateViaCache: 'none'
            });

            swRegistration = registration;
            console.log('[PWA] Service Worker registered successfully:', registration.scope);

            // Check for updates immediately on page load
            registration.update();

            // Check for updates more frequently (every 30 seconds)
            setInterval(() => {
                registration.update();
            }, 30000);

            // Handle updates - auto-update when new SW is ready
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                console.log('[PWA] New service worker found, state:', newWorker.state);

                newWorker.addEventListener('statechange', () => {
                    console.log('[PWA] Service worker state changed:', newWorker.state);

                    if (newWorker.state === 'installed') {
                        if (navigator.serviceWorker.controller) {
                            // New service worker available, auto-update
                            console.log('[PWA] New version installed, triggering update...');
                            newWorker.postMessage({ type: 'SKIP_WAITING' });
                        }
                    }
                });
            });

            // Listen for SW_UPDATED message and reload
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'SW_UPDATED') {
                    console.log('[PWA] Service worker updated to version:', event.data.version);
                    // Auto-reload to get new version (do it gracefully)
                    window.location.reload();
                }
            });

            // Handle controller change (when new SW takes over)
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                console.log('[PWA] Controller changed, reloading page...');
                window.location.reload();
            });

            return registration;
        } catch (error) {
            console.error('[PWA] Service Worker registration failed:', error);
            throw error;
        }
    } else {
        console.warn('[PWA] Service Workers are not supported in this browser');
        return null;
    }
}

/**
 * Force update the service worker
 */
export async function forceUpdate() {
    if (swRegistration) {
        console.log('[PWA] Forcing service worker update...');
        await swRegistration.update();

        if (swRegistration.waiting) {
            swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
    }
}

/**
 * Unregister the service worker (for debugging)
 */
export async function unregisterServiceWorker() {
    if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
            await registration.unregister();
            console.log('[PWA] Service Worker unregistered');
        }
    }
}

/**
 * Clear all caches and force reload
 */
export async function hardRefresh() {
    console.log('[PWA] Performing hard refresh...');

    // Clear all caches
    if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('[PWA] All caches cleared');
    }

    // Unregister service worker
    if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
            await registration.unregister();
            console.log('[PWA] Service worker unregistered');
        }
    }

    // Force reload from server
    window.location.reload(true);
}

/**
 * Capture install prompt for custom install button
 */
export function captureInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent the mini-infobar from appearing on mobile
        e.preventDefault();
        // Stash the event so it can be triggered later
        deferredPrompt = e;
        console.log('[PWA] Install prompt captured');

        // Show custom install button
        showInstallButton();
    });

    // Log install event
    window.addEventListener('appinstalled', () => {
        console.log('[PWA] App installed successfully');
        deferredPrompt = null;
        hideInstallButton();
    });
}

/**
 * Trigger install prompt
 */
export async function promptInstall() {
    if (!deferredPrompt) {
        console.log('[PWA] Install prompt not available');
        return false;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] User response to install prompt: ${outcome}`);

    // Clear the deferredPrompt
    deferredPrompt = null;

    return outcome === 'accepted';
}

/**
 * Check if app is installed
 */
export function isAppInstalled() {
    // Check if running in standalone mode
    return window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;
}

/**
 * Show install button (integrate with your UI)
 */
function showInstallButton() {
    // Dispatch custom event that your app can listen to
    window.dispatchEvent(new CustomEvent('pwa-install-available'));
}

/**
 * Hide install button
 */
function hideInstallButton() {
    window.dispatchEvent(new CustomEvent('pwa-install-completed'));
}

/**
 * Clear all caches (for debugging)
 */
export async function clearAllCaches() {
    if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('[PWA] All caches cleared');
    }
}

/**
 * Clear auth-related caches (use on login/logout)
 */
export async function clearAuthCaches() {
    if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
            const cache = await caches.open(cacheName);
            const requests = await cache.keys();
            for (const request of requests) {
                const url = new URL(request.url);
                if (url.pathname.includes('/auth/') || url.pathname.includes('/verify')) {
                    await cache.delete(request);
                    console.log('[PWA] Cleared auth cache:', request.url);
                }
            }
        }
    }
}

/**
 * Check if service worker is ready
 */
export async function isServiceWorkerReady() {
    if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        return registration && registration.active;
    }
    return false;
}

/**
 * Check if online
 */
export function isOnline() {
    return navigator.onLine;
}

/**
 * Listen for online/offline events
 */
export function setupConnectivityListeners(onOnline, onOffline) {
    window.addEventListener('online', () => {
        console.log('[PWA] Connection restored');
        if (onOnline) onOnline();
    });

    window.addEventListener('offline', () => {
        console.log('[PWA] Connection lost');
        if (onOffline) onOffline();
    });
}

/**
 * Get current service worker version
 */
export async function getServiceWorkerVersion() {
    if (!navigator.serviceWorker.controller) {
        return null;
    }

    return new Promise((resolve) => {
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
            resolve(event.data.version);
        };
        navigator.serviceWorker.controller.postMessage(
            { type: 'GET_VERSION' },
            [messageChannel.port2]
        );

        // Timeout after 1 second
        setTimeout(() => resolve(null), 1000);
    });
}
