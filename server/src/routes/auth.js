const express = require('express');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const User = require('../models/User');
const { authLimiter } = require('../middleware/rateLimiter');
const { validateAuth } = require('../middleware/inputValidator');

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
// const isProduction = process.env.NODE_ENV === 'production';
const isProduction = true;

// Health check endpoint for Docker and monitoring
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});


router.post('/signup', authLimiter, validateAuth, async (req, res) => {
    try {
        const { username, password, acceptedTerms, acceptedPrivacy } = req.body;

        // Validate terms acceptance
        if (!acceptedTerms || !acceptedPrivacy) {
            return res.status(400).json({
                error: 'You must accept the Terms of Service and Privacy Policy to create an account'
            });
        }

        const user = await User.create(username, password);

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
                role: user.role
            }
        });
    } catch (err) {
        logger.error('User signup failed', {
            error: err,
            context: { username: req.body.username },
            requestId: req.requestId
        });

        if (err.name && err.name == 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ error: 'Username already exists' });
        }
        res.status(500).json({ error: 'Failed to create account' });
    }
});

router.post('/login', authLimiter, async (req, res) => {
    console.log('=== LOGIN REQUEST RECEIVED ===');
    console.log('Body:', { username: req.body.username, hasPassword: !!req.body.password });

    try {
        const { username, password } = req.body;

        if (!username || !password) {
            console.log('Login failed: Missing credentials');
            return res.status(400).json({ error: 'Username and password are required' });
        }

        console.log('Looking up user:', username);
        const user = await User.findByUsername(username);

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
                role: user.role
            }
        });
    } catch (err) {
        console.error('❌ Login error:', err);
        logger.error('User login failed', {
            error: err,
            context: { username: req.body.username },
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
