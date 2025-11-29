/**
 * Request Logger Middleware
 * 
 * Provides:
 * - Unique request ID generation for tracing
 * - Request/response logging
 * - Performance tracking
 * - Suspicious activity detection
 */

const logger = require('../utils/logger');
const crypto = require('crypto');

/**
 * Generate unique request ID
 */
function generateRequestId() {
    return crypto.randomBytes(8).toString('hex');
}

/**
 * Detect suspicious patterns in request
 */
function detectSuspiciousPatterns(req) {
    const suspiciousPatterns = [
        { pattern: /(%27)|(')|(--)|(%23)|(#)/i, type: 'SQL_INJECTION' },
        { pattern: /(<script|javascript:|onerror=)/i, type: 'XSS' },
        { pattern: /(\.\.\/|\.\.\\)/i, type: 'PATH_TRAVERSAL' }
    ];

    const fullUrl = req.originalUrl;
    const body = JSON.stringify(req.body);

    for (const { pattern, type } of suspiciousPatterns) {
        if (pattern.test(fullUrl) || pattern.test(body)) {
            return type;
        }
    }

    return null;
}

/**
 * Request logger middleware
 */
function requestLogger(req, res, next) {
    // Generate and attach request ID
    const requestId = generateRequestId();
    req.requestId = requestId;

    // Create request-scoped logger
    req.logger = logger.child({ requestId });

    const start = Date.now();

    // Log incoming request
    req.logger.info('Incoming request', {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('user-agent')
    });

    // Check for suspicious patterns
    const suspiciousType = detectSuspiciousPatterns(req);
    if (suspiciousType) {
        req.logger.warn('Suspicious request detected', {
            type: suspiciousType,
            method: req.method,
            path: req.path,
            ip: req.ip
        });
    }

    // Log response when finished
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logLevel = res.statusCode >= 500 ? 'error' :
            res.statusCode >= 400 ? 'warn' : 'info';

        req.logger[logLevel]('Request completed', {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            slow: duration > 100
        });
    });

    next();
}

module.exports = requestLogger;
