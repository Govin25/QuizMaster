/**
 * Centralized Logger Utility
 * 
 * Provides structured logging with:
 * - Log levels (ERROR, WARN, INFO, DEBUG)
 * - Sensitive data sanitization
 * - Environment-based filtering
 * - Request ID tracking
 * - Easy integration with centralized logging solutions
 */

const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

const LOG_COLORS = {
    ERROR: '\x1b[31m', // Red
    WARN: '\x1b[33m',  // Yellow
    INFO: '\x1b[36m',  // Cyan
    DEBUG: '\x1b[90m', // Gray
    RESET: '\x1b[0m'
};

// Sensitive fields to redact from logs
const SENSITIVE_FIELDS = [
    'password',
    'token',
    'accessToken',
    'refreshToken',
    'authorization',
    'cookie',
    'secret',
    'apiKey',
    'api_key',
    'privateKey',
    'private_key'
];

class Logger {
    constructor() {
        // Determine log level from environment
        const envLogLevel = (process.env.LOG_LEVEL || '').toUpperCase();
        const nodeEnv = process.env.NODE_ENV || 'development';

        // Default to DEBUG in development, INFO in production
        if (envLogLevel && LOG_LEVELS[envLogLevel] !== undefined) {
            this.level = LOG_LEVELS[envLogLevel];
        } else {
            this.level = nodeEnv === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG;
        }

        this.useColors = process.env.NO_COLOR !== 'true' && nodeEnv !== 'production';
    }

    /**
     * Sanitize sensitive data from objects
     */
    sanitize(obj) {
        if (!obj || typeof obj !== 'object') {
            return obj;
        }

        if (obj instanceof Error) {
            return {
                name: obj.name,
                message: obj.message,
                stack: obj.stack,
                ...this.sanitize(obj.cause)
            };
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.sanitize(item));
        }

        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            const lowerKey = key.toLowerCase();

            // Check if field is sensitive
            if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
                sanitized[key] = '[REDACTED]';
            } else if (value && typeof value === 'object') {
                sanitized[key] = this.sanitize(value);
            } else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }

    /**
     * Format log message
     */
    format(level, message, context = {}) {
        const timestamp = new Date().toISOString();
        const sanitizedContext = this.sanitize(context);

        const logEntry = {
            timestamp,
            level,
            message,
            ...sanitizedContext
        };

        return logEntry;
    }

    /**
     * Output log to console
     */
    output(level, logEntry) {
        const logString = JSON.stringify(logEntry, null, 2);

        if (this.useColors) {
            const color = LOG_COLORS[level] || LOG_COLORS.RESET;
            console.log(`${color}[${level}]${LOG_COLORS.RESET} ${logString}`);
        } else {
            console.log(logString);
        }
    }

    /**
     * Check if log level should be output
     */
    shouldLog(level) {
        return LOG_LEVELS[level] <= this.level;
    }

    /**
     * Log error message
     */
    error(message, context = {}) {
        if (!this.shouldLog('ERROR')) return;

        const logEntry = this.format('ERROR', message, context);
        this.output('ERROR', logEntry);
    }

    /**
     * Log warning message
     */
    warn(message, context = {}) {
        if (!this.shouldLog('WARN')) return;

        const logEntry = this.format('WARN', message, context);
        this.output('WARN', logEntry);
    }

    /**
     * Log info message
     */
    info(message, context = {}) {
        if (!this.shouldLog('INFO')) return;

        const logEntry = this.format('INFO', message, context);
        this.output('INFO', logEntry);
    }

    /**
     * Log debug message
     */
    debug(message, context = {}) {
        if (!this.shouldLog('DEBUG')) return;

        const logEntry = this.format('DEBUG', message, context);
        this.output('DEBUG', logEntry);
    }

    /**
     * Create a child logger with persistent context
     */
    child(context = {}) {
        const childLogger = Object.create(this);
        childLogger.defaultContext = { ...this.defaultContext, ...context };

        // Override methods to include default context
        ['error', 'warn', 'info', 'debug'].forEach(method => {
            const originalMethod = this[method].bind(this);
            childLogger[method] = (message, additionalContext = {}) => {
                originalMethod(message, { ...childLogger.defaultContext, ...additionalContext });
            };
        });

        return childLogger;
    }

    /**
     * Time an operation
     */
    time(label) {
        const start = Date.now();
        return {
            end: (message, context = {}) => {
                const duration = Date.now() - start;
                this.debug(message || `${label} completed`, {
                    ...context,
                    duration: `${duration}ms`,
                    operation: label
                });
                return duration;
            }
        };
    }
}

// Export singleton instance
const logger = new Logger();

module.exports = logger;
