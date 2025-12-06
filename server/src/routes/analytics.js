const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const AnalyticsService = require('../services/analyticsService');
const logger = require('../utils/logger');
const { handleError } = require('../utils/errorHandler');

/**
 * @route GET /api/analytics
 * @desc Get comprehensive user statistics
 * @access Private
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const stats = await AnalyticsService.getUserStats(req.user.id);
        res.json(stats);
    } catch (err) {
        logger.error('Error fetching user stats', { error: err, userId: req.user.id });
        res.status(500).json(handleError(err));
    }
});

/**
 * @route GET /api/analytics/categories
 * @desc Get category-wise performance
 * @access Private
 */
router.get('/categories', authenticateToken, async (req, res) => {
    try {
        const stats = await AnalyticsService.getCategoryStats(req.user.id);
        res.json(stats);
    } catch (err) {
        logger.error('Error fetching category stats', { error: err, userId: req.user.id });
        res.status(500).json(handleError(err));
    }
});

/**
 * @route GET /api/analytics/trends
 * @desc Get performance trends
 * @access Private
 */
router.get('/trends', authenticateToken, async (req, res) => {
    try {
        const days = req.query.days ? parseInt(req.query.days) : 30;
        const trends = await AnalyticsService.getPerformanceTrends(req.user.id, days);
        res.json(trends);
    } catch (err) {
        logger.error('Error fetching performance trends', { error: err, userId: req.user.id });
        res.status(500).json(handleError(err));
    }
});

/**
 * @route GET /api/analytics/heatmap
 * @desc Get activity heatmap
 * @access Private
 */
router.get('/heatmap', authenticateToken, async (req, res) => {
    try {
        const heatmap = await AnalyticsService.getActivityHeatmap(req.user.id);
        res.json(heatmap);
    } catch (err) {
        logger.error('Error fetching activity heatmap', { error: err, userId: req.user.id });
        res.status(500).json(handleError(err));
    }
});

/**
 * @route GET /api/analytics/recent
 * @desc Get recent attempts
 * @access Private
 */
router.get('/recent', authenticateToken, async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 10;
        const attempts = await AnalyticsService.getRecentAttempts(req.user.id, limit);
        res.json(attempts);
    } catch (err) {
        logger.error('Error fetching recent attempts', { error: err, userId: req.user.id });
        res.status(500).json(handleError(err));
    }
});

/**
 * @route GET /api/analytics/difficulty
 * @desc Get difficulty distribution
 * @access Private
 */
router.get('/difficulty', authenticateToken, async (req, res) => {
    try {
        const distribution = await AnalyticsService.getDifficultyDistribution(req.user.id);
        res.json(distribution);
    } catch (err) {
        logger.error('Error fetching difficulty distribution', { error: err, userId: req.user.id });
        res.status(500).json(handleError(err));
    }
});

/**
 * @route GET /api/analytics/rank
 * @desc Get user rank
 * @access Private
 */
router.get('/rank', authenticateToken, async (req, res) => {
    try {
        const rank = await AnalyticsService.getUserRank(req.user.id);
        res.json(rank);
    } catch (err) {
        logger.error('Error fetching user rank', { error: err, userId: req.user.id });
        res.status(500).json(handleError(err));
    }
});

/**
 * @route GET /api/analytics/improvement
 * @desc Get improvement rate
 * @access Private
 */
router.get('/improvement', authenticateToken, async (req, res) => {
    try {
        const improvement = await AnalyticsService.getImprovementRate(req.user.id);
        res.json(improvement);
    } catch (err) {
        logger.error('Error fetching improvement rate', { error: err, userId: req.user.id });
        res.status(500).json(handleError(err));
    }
});

/**
 * @route GET /api/analytics/recommendations
 * @desc Get personalized recommendations
 * @access Private
 */
router.get('/recommendations', authenticateToken, async (req, res) => {
    try {
        const recommendations = await AnalyticsService.getRecommendations(req.user.id);
        res.json(recommendations);
    } catch (err) {
        logger.error('Error fetching recommendations', { error: err, userId: req.user.id });
        res.status(500).json(handleError(err));
    }
});

module.exports = router;
