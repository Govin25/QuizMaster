const rateLimit = require('express-rate-limit');

// Custom handler to return JSON instead of plain text
const jsonHandler = (req, res) => {
    res.status(429).json({
        error: req.rateLimit.message || 'Too many requests, please try again later.'
    });
};

// General API rate limiter
const apiLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 1500, // Limit each IP to 1500 requests per 5 minutes
    message: 'Too many requests from this IP, please try again after 5 minutes.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: jsonHandler
});

// Strict limiter for authentication endpoints
const authLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 10, // Limit each IP to 10 requests per 10 minutes
    message: 'Too many authentication attempts, please try again after 10 minutes.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false, // Count all requests
    handler: jsonHandler
});

// Limiter for file uploads
const uploadLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5, // Limit each IP to 5 uploads per 10 minutes
    message: 'Too many file uploads, please try again after 10 minutes.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: jsonHandler
});

// Limiter for quiz creation
const createQuizLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5, // Limit each IP to 5 quiz creations per 10 minutes
    message: 'Too many quiz creations, please try again after 10 minutes.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: jsonHandler
});

module.exports = {
    apiLimiter,
    authLimiter,
    uploadLimiter,
    createQuizLimiter
};
