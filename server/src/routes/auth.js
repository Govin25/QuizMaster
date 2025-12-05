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

        // Set secure httpOnly cookie (same config as login)
        const isProduction = process.env.NODE_ENV === 'production';

        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'lax' : 'none',
            maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
        });

        console.log('Signup successful - Cookie set:', {
            username: user.username,
            cookieOptions: {
                httpOnly: true,
                secure: isProduction,
                sameSite: isProduction ? 'lax' : 'none'
            }
        });

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
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const user = await User.findByUsername(username);
        if (!user || !(await User.validatePassword(user, password))) {
            // Generic error message to prevent user enumeration
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            SECRET_KEY,
            { expiresIn: '7d' }
        );

        // Set secure httpOnly cookie
        // For cross-origin dev (localhost:5173 -> localhost:3001), we need sameSite: 'none'
        // But sameSite: 'none' requires secure: true, which needs HTTPS
        // In dev, we'll use sameSite: 'none' without secure (browsers allow this for localhost)
        const isProduction = process.env.NODE_ENV === 'production';

        res.cookie('auth_token', token, {
            httpOnly: true,  // Prevents JavaScript access (XSS protection)
            secure: isProduction,  // HTTPS only in production
            sameSite: isProduction ? 'lax' : 'none',  // 'none' for cross-origin dev, 'lax' for production
            maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
        });

        console.log('Login successful - Cookie set:', {
            username: user.username,
            cookieOptions: {
                httpOnly: true,
                secure: isProduction,
                sameSite: isProduction ? 'lax' : 'none'
            }
        });

        res.json({
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });
    } catch (err) {
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
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    });
    res.json({ message: 'Logged out successfully' });
});

// Verify authentication status (for client-side checks)
const { authenticateToken } = require('../middleware/authMiddleware');
router.get('/verify', authenticateToken, (req, res) => {
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
