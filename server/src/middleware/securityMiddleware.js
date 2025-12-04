const logger = require('../utils/logger');

/**
 * HTTPS Redirect Middleware
 * Redirects HTTP requests to HTTPS in production
 */
const httpsRedirect = (req, res, next) => {
    // Only enforce in production
    if (process.env.NODE_ENV === 'production') {
        // Check if request is not secure
        if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
            logger.warn('HTTP request redirected to HTTPS', {
                originalUrl: req.originalUrl,
                ip: req.ip,
                userAgent: req.get('user-agent')
            });

            return res.redirect(301, `https://${req.headers.host}${req.url}`);
        }
    }
    next();
};

/**
 * Security Event Logger
 * Logs security-related events for monitoring
 */
const securityLogger = (req, res, next) => {
    // Log authentication attempts
    if (req.path.includes('/auth/')) {
        logger.info('Authentication endpoint accessed', {
            path: req.path,
            method: req.method,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });
    }

    // Log suspicious activity
    const suspiciousPatterns = [
        /\.\.\//,  // Path traversal
        /<script>/i,  // XSS attempts
        /union.*select/i,  // SQL injection
    ];

    const isSuspicious = suspiciousPatterns.some(pattern =>
        pattern.test(req.url) ||
        pattern.test(JSON.stringify(req.body))
    );

    if (isSuspicious) {
        logger.warn('Suspicious request detected', {
            path: req.path,
            method: req.method,
            ip: req.ip,
            userAgent: req.get('user-agent'),
            body: req.body
        });
    }

    next();
};

/**
 * Production Security Checks
 * Validates security configuration in production
 */
const validateProductionSecurity = () => {
    if (process.env.NODE_ENV === 'production') {
        const warnings = [];

        // Check JWT secret
        if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'secret_key') {
            warnings.push('JWT_SECRET not set or using default value');
        }

        // Check client URL is HTTPS
        if (process.env.CLIENT_URL && !process.env.CLIENT_URL.startsWith('https://')) {
            warnings.push('CLIENT_URL should use HTTPS in production');
        }

        // Log warnings
        if (warnings.length > 0) {
            logger.error('Production security configuration issues detected', {
                warnings,
                security: 'CRITICAL'
            });
        }
    }
};

module.exports = {
    httpsRedirect,
    securityLogger,
    validateProductionSecurity
};
