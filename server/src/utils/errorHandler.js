const logger = require('./logger');
const ConcurrencyError = require('./ConcurrencyError');

/**
 * User-friendly error messages mapped to common error scenarios
 */
const ERROR_MESSAGES = {
    // Generic
    INTERNAL_ERROR: 'Something went wrong. Please try again later.',
    NOT_FOUND: 'The requested resource was not found.',
    UNAUTHORIZED: 'You are not authorized to perform this action.',
    VALIDATION_ERROR: 'Invalid input provided.',

    // Quiz-specific
    QUIZ_NOT_FOUND: 'Quiz not found.',
    QUIZ_GENERATION_FAILED: 'Failed to generate quiz. Please try again.',
    QUIZ_SAVE_FAILED: 'Failed to save quiz. Please try again.',

    // Challenge-specific
    CHALLENGE_NOT_FOUND: 'Challenge not found.',
    CHALLENGE_CREATION_FAILED: 'Failed to create challenge. Please try again.',

    // User-specific
    USER_NOT_FOUND: 'User not found.',
    PROFILE_LOAD_FAILED: 'Failed to load profile. Please try again.',

    // Social-specific
    FOLLOW_FAILED: 'Failed to follow user. Please try again.',
    LIKE_FAILED: 'Failed to like quiz. Please try again.',

    // Data-specific
    DATA_EXPORT_FAILED: 'Failed to export data. Please try again.',
    DELETION_FAILED: 'Failed to process deletion request. Please try again.',

    // Concurrency-specific
    CONCURRENCY_CONFLICT: 'This resource was modified by another session. Please refresh and try again.',
};

/**
 * Handle errors by logging technical details and returning user-friendly messages
 * @param {Error} error - The error object
 * @param {Object} context - Additional context for logging (userId, quizId, etc.)
 * @param {string} userMessage - Optional custom user-friendly message
 * @returns {Object} - Object with user-friendly error message
 */
function handleError(error, context = {}, userMessage = null) {
    // Handle ConcurrencyError specially
    if (error instanceof ConcurrencyError) {
        logger.warn('Concurrency conflict detected', {
            resource: error.resource,
            expectedVersion: error.expectedVersion,
            actualVersion: error.actualVersion,
            context: context
        });

        return {
            error: error.message,
            statusCode: 409,
            shouldRefresh: true,
            resource: error.resource,
            expectedVersion: error.expectedVersion,
            actualVersion: error.actualVersion,
        };
    }

    // Log the full technical error
    logger.error('Error occurred', {
        error: error,
        message: error.message,
        stack: error.stack,
        context: context
    });

    // Determine user-friendly message
    let friendlyMessage = userMessage || ERROR_MESSAGES.INTERNAL_ERROR;

    // Map specific error messages to user-friendly ones
    if (error.message) {
        const msg = error.message.toLowerCase();

        if (msg.includes('not found')) {
            if (msg.includes('user')) friendlyMessage = ERROR_MESSAGES.USER_NOT_FOUND;
            else if (msg.includes('quiz')) friendlyMessage = ERROR_MESSAGES.QUIZ_NOT_FOUND;
            else if (msg.includes('challenge')) friendlyMessage = ERROR_MESSAGES.CHALLENGE_NOT_FOUND;
            else friendlyMessage = ERROR_MESSAGES.NOT_FOUND;
        }
        else if (msg.includes('unauthorized') || msg.includes('permission')) {
            friendlyMessage = ERROR_MESSAGES.UNAUTHORIZED;
        }
        else if (msg.includes('validation') || msg.includes('invalid')) {
            friendlyMessage = ERROR_MESSAGES.VALIDATION_ERROR;
        }
        else if (msg.includes('already')) {
            // Keep specific "already" messages as they're user-friendly
            friendlyMessage = error.message;
        }
    }

    return { error: friendlyMessage };
}

/**
 * Middleware to catch unhandled errors
 */
function errorMiddleware(err, req, res, next) {
    const response = handleError(err, {
        path: req.path,
        method: req.method,
        userId: req.user?.id,
        requestId: req.requestId
    });

    // Use error's statusCode if it's a ConcurrencyError, otherwise use err.status or 500
    const statusCode = err instanceof ConcurrencyError ? 409 : (err.status || 500);
    res.status(statusCode).json(response);
}

module.exports = {
    handleError,
    errorMiddleware,
    ERROR_MESSAGES
};
