// Service Worker Registration and Management

let deferredPrompt = null;
let swRegistration = null;

/**
 * Register the service worker
 */
export async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/service-worker.js', {
                scope: '/'
            });

            swRegistration = registration;
            console.log('[PWA] Service Worker registered successfully:', registration.scope);

            // Check for updates periodically
            setInterval(() => {
                registration.update();
            }, 60000); // Check every minute

            // Handle updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;

                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // New service worker available
                        console.log('[PWA] New version available!');
                        showUpdateNotification();
                    }
                });
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
 * Show update notification to user
 */
function showUpdateNotification() {
    // You can integrate this with your toast notification system
    const updateAvailable = confirm('A new version of QuizMaster is available! Reload to update?');

    if (updateAvailable && swRegistration && swRegistration.waiting) {
        swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
    }
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
