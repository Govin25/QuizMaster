const express = require('express');
const router = express.Router();
const { User, Quiz, Result } = require('../models/sequelize');

/**
 * GET /api/public/stats
 * Get public statistics for landing page
 * No authentication required
 */
router.get('/stats', async (req, res) => {
    try {
        // Count total users
        const totalUsers = await User.count();

        // Count total quizzes (both public and private)
        const totalQuizzes = await Quiz.count();

        // Count total quiz attempts (results)
        const totalAttempts = await Result.count();

        res.json({
            totalUsers,
            totalQuizzes,
            totalAttempts
        });
    } catch (error) {
        console.error('Error fetching public stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

module.exports = router;
