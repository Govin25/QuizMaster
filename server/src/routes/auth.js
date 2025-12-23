const express = require('express');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const User = require('../models/User');
const { authLimiter } = require('../middleware/rateLimiter');
const { validateSignup, validateLogin } = require('../middleware/inputValidator');

const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET || 'secret_key';

// Warn if using default secret
if (SECRET_KEY === 'secret_key') {
    logger.warn('Using default JWT_SECRET - set a strong secret in production', {
        security: 'CRITICAL'
    });
}

// Determine authentication security level based on environment
// Railway sets RAILWAY_ENVIRONMENT, so we use that or NODE_ENV=production
const isProduction = process.env.NODE_ENV === 'production';
// const isProduction = true;

// Health check endpoint for Docker and monitoring
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});


router.post('/signup', authLimiter, validateSignup, async (req, res) => {
    try {
        const { name, email, password, acceptedTerms, acceptedPrivacy } = req.body;

        // Validate terms acceptance
        if (!acceptedTerms || !acceptedPrivacy) {
            return res.status(400).json({
                error: 'You must accept the Terms of Service and Privacy Policy to create an account'
            });
        }

        // Check if email already exists
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(409).json({ error: 'An account with this email already exists' });
        }

        const user = await User.create(name, email, password);

        // Record terms acceptance timestamps
        const { User: UserModel } = require('../models/sequelize');
        const userRecord = await UserModel.findByPk(user.id);
        const now = new Date();
        userRecord.terms_accepted_at = now;
        userRecord.privacy_accepted_at = now;
        await userRecord.save();

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            SECRET_KEY,
            { expiresIn: '7d' } // Extended for better UX
        );

        // Set secure httpOnly cookie with iOS-compatible settings
        const cookieOptions = {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
        };

        res.cookie('auth_token', token, cookieOptions);

        // Prevent caching of auth responses
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');

        console.log('Signup successful - Cookie set for', user.username);

        res.status(201).json({
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                email: user.email,
                role: user.role
            },
            token // Return token for client-side storage (iOS fix)
        });
    } catch (err) {
        logger.error('User signup failed', {
            error: err,
            context: { email: req.body.email },
            requestId: req.requestId
        });

        if (err.name && err.name == 'SequelizeUniqueConstraintError') {
            // Check if it's email or username conflict
            if (err.errors && err.errors[0]?.path === 'email') {
                return res.status(409).json({ error: 'An account with this email already exists' });
            }
            return res.status(409).json({ error: 'Username already exists. Please try again.' });
        }
        res.status(500).json({ error: 'Failed to create account' });
    }
});

router.post('/login', authLimiter, validateLogin, async (req, res) => {
    console.log('=== LOGIN REQUEST RECEIVED ===');
    console.log('Body:', { identifier: req.body.identifier, hasPassword: !!req.body.password });

    try {
        const { identifier, password } = req.body;

        if (!identifier || !password) {
            console.log('Login failed: Missing credentials');
            return res.status(400).json({ error: 'Email/username and password are required' });
        }

        console.log('Looking up user:', identifier);
        // Try to find by email or username
        const user = await User.findByEmailOrUsername(identifier);

        if (!user) {
            console.log('Login failed: User not found');
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        console.log('User found, validating password...');
        const isValidPassword = await User.validatePassword(user, password);

        if (!isValidPassword) {
            console.log('Login failed: Invalid password');
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        console.log('Password valid, generating token...');
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            SECRET_KEY,
            { expiresIn: '7d' }
        );

        console.log('Token generated:', token.substring(0, 20) + '...');

        // Set secure httpOnly cookie with iOS-compatible settings
        const cookieOptions = {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
        };

        res.cookie('auth_token', token, cookieOptions);

        // Prevent caching of auth responses (critical for iOS)
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');

        console.log('✅ Login successful - Cookie set for', user.username);

        res.json({
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                email: user.email,
                role: user.role
            },
            token // Return token for client-side storage (iOS fix)
        });
    } catch (err) {
        console.error('❌ Login error:', err);
        logger.error('User login failed', {
            error: err,
            context: { identifier: req.body.identifier },
            requestId: req.requestId
        });
        res.status(500).json({ error: 'Login failed' });
    }
});

// Logout endpoint - clears the auth cookie
router.post('/logout', (req, res) => {
    res.clearCookie('auth_token', {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax'
    });
    res.json({ message: 'Logged out successfully' });
});

// Verify authentication status (for client-side checks)
const { authenticateToken } = require('../middleware/authMiddleware');
router.get('/verify', authenticateToken, (req, res) => {
    // Prevent caching of verification responses
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    res.json({
        authenticated: true,
        user: {
            id: req.user.id,
            username: req.user.username,
            role: req.user.role
        }
    });
});

module.exports = router;
