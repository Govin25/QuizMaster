const express = require('express');
const router = express.Router();
const { User, Quiz, Result } = require('../models/sequelize');
const db = require('../db');

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

        // Count total completed challenges (1v1 + group)
        const challengeCount = await new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    (SELECT COUNT(*) FROM challenges WHERE status = 'completed') +
                    (SELECT COUNT(*) FROM group_challenges WHERE status = 'completed') as total
            `;
            db.get(query, [], (err, row) => {
                if (err) {
                    console.error('Error counting challenges:', err);
                    resolve(0); // Fallback to 0 if error
                } else {
                    resolve(row?.total || 0);
                }
            });
        });

        res.json({
            totalUsers,
            totalQuizzes,
            totalAttempts,
            totalChallenges: challengeCount
        });
    } catch (error) {
        console.error('Error fetching public stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

module.exports = router;

