/**
 * Custom error class for concurrency conflicts
 * Thrown when optimistic locking detects a version mismatch
 */
class ConcurrencyError extends Error {
    /**
     * @param {string} message - Error message
     * @param {string} resource - Resource type (e.g., 'quiz', 'challenge')
     * @param {number} expectedVersion - Version that was expected
     * @param {number} actualVersion - Actual current version
     */
    constructor(message, resource, expectedVersion, actualVersion) {
        super(message);
        this.name = 'ConcurrencyError';
        this.statusCode = 409; // Conflict
        this.resource = resource;
        this.expectedVersion = expectedVersion;
        this.actualVersion = actualVersion;
        this.shouldRefresh = true; // Signal to frontend to refresh data

        // Maintains proper stack trace for where error was thrown
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ConcurrencyError);
        }
    }

    /**
     * Convert error to JSON response format
     */
    toJSON() {
        return {
            error: this.message,
            name: this.name,
            statusCode: this.statusCode,
            resource: this.resource,
            expectedVersion: this.expectedVersion,
            actualVersion: this.actualVersion,
            shouldRefresh: this.shouldRefresh,
        };
    }
}

module.exports = ConcurrencyError;
