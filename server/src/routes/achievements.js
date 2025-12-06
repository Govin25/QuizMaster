const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const AchievementService = require('../services/achievementService');
const logger = require('../utils/logger');
const { handleError } = require('../utils/errorHandler');

/**
 * @route GET /api/achievements
 * @desc Get user's achievement progress
 * @access Private
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const progress = await AchievementService.getAchievementProgress(req.user.id);
        res.json(progress);
    } catch (err) {
        logger.error('Error fetching achievement progress', { error: err, userId: req.user.id });
        res.status(500).json(handleError(err));
    }
});

/**
 * @route GET /api/achievements/all
 * @desc Get all available achievements
 * @access Private
 */
router.get('/all', authenticateToken, (req, res) => {
    try {
        const achievements = AchievementService.getAllAchievements();
        res.json(achievements);
    } catch (err) {
        logger.error('Error fetching all achievements', { error: err });
        res.status(500).json(handleError(err));
    }
});

/**
 * @route POST /api/achievements/check
 * @desc Trigger achievement check manually (debug/dev purposes)
 * @access Private
 */
router.post('/check', authenticateToken, async (req, res) => {
    try {
        const newAchievements = await AchievementService.checkAndAwardAchievements(req.user.id);
        res.json({ newAchievements });
    } catch (err) {
        logger.error('Error checking achievements', { error: err, userId: req.user.id });
        res.status(500).json(handleError(err));
    }
});

module.exports = router;
