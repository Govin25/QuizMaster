/**
 * Centralized concurrency error handling for the frontend
 * Detects 409 Conflict responses and provides user-friendly feedback
 */

/**
 * Check if an error is a concurrency conflict (409)
 * @param {Error|Object} error - Error object or response
 * @returns {boolean} True if it's a concurrency error
 */
export const isConcurrencyError = (error) => {
    return error?.statusCode === 409 ||
        error?.status === 409 ||
        error?.response?.status === 409 ||
        error?.shouldRefresh === true;
};

/**
 * Handle concurrency errors with automatic refresh and user notification
 * @param {Error|Object} error - The error object
 * @param {string} resourceType - Type of resource (e.g., 'quiz', 'challenge')
 * @param {Function} refreshCallback - Function to call to refresh data
 * @param {Function} showToast - Toast notification function
 * @returns {Promise<boolean>} True if handled as concurrency error
 */
export const handleConcurrencyError = async (error, resourceType, refreshCallback, showToast) => {
    if (!isConcurrencyError(error)) {
        return false; // Not a concurrency error
    }

    // Extract error details
    const expectedVersion = error?.expectedVersion;
    const actualVersion = error?.actualVersion;

    // Show user-friendly message
    const message = `This ${resourceType} was modified by another session. Refreshing to show latest changes...`;

    if (showToast) {
        showToast(message, 'warning');
    } else {
        console.warn(message, { expectedVersion, actualVersion });
    }

    // Auto-refresh data if callback provided
    if (refreshCallback && typeof refreshCallback === 'function') {
        try {
            await refreshCallback();
        } catch (refreshError) {
            console.error('Failed to refresh after concurrency error:', refreshError);
            if (showToast) {
                showToast('Failed to refresh data. Please reload the page.', 'error');
            }
        }
    }

    return true; // Handled
};

/**
 * Wrap an API call with concurrency error handling
 * @param {Function} apiCall - The API call function to execute
 * @param {string} resourceType - Type of resource
 * @param {Function} refreshCallback - Function to refresh data on conflict
 * @param {Function} showToast - Toast notification function
 * @returns {Promise<any>} Result of the API call
 */
export const withConcurrencyHandling = async (apiCall, resourceType, refreshCallback, showToast) => {
    try {
        return await apiCall();
    } catch (error) {
        const handled = await handleConcurrencyError(error, resourceType, refreshCallback, showToast);

        if (!handled) {
            // Re-throw if not a concurrency error
            throw error;
        }

        // Return null or undefined to indicate the operation was cancelled due to conflict
        return null;
    }
};

/**
 * Extract version from quiz or challenge object
 * @param {Object} resource - Quiz or challenge object
 * @returns {number|null} Version number or null if not found
 */
export const getResourceVersion = (resource) => {
    return resource?.version ?? null;
};

/**
 * Create a user-friendly concurrency error message
 * @param {string} operation - The operation being performed (e.g., 'delete', 'update')
 * @param {string} resourceType - Type of resource
 * @returns {string} User-friendly message
 */
export const getConcurrencyMessage = (operation, resourceType) => {
    const messages = {
        delete: `Cannot ${operation} this ${resourceType} because it was modified by another session.`,
        update: `Cannot ${operation} this ${resourceType} because it was modified by another session.`,
        publish: `Cannot publish this ${resourceType} because it was modified by another session.`,
        accept: `Cannot accept this ${resourceType} because it was modified by another session.`,
        decline: `Cannot decline this ${resourceType} because it was modified by another session.`,
        cancel: `Cannot cancel this ${resourceType} because it was modified by another session.`,
    };

    return messages[operation] || `This ${resourceType} was modified by another session.`;
};
