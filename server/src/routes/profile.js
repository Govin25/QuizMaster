const express = require('express');
const logger = require('../utils/logger');
const { authenticateToken } = require('../middleware/authMiddleware');
const analyticsService = require('../services/analyticsService');
const achievementService = require('../services/achievementService');
const cache = require('../utils/cache');
const { handleError } = require('../utils/errorHandler');

const router = express.Router();

// Get public user information
router.get('/user/:userId', authenticateToken, async (req, res) => {
    try {
        const UserRepository = require('../repositories/UserRepository');
        const userId = parseInt(req.params.userId);

        const userData = await UserRepository.getPublicUserData(userId);

        if (!userData) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(userData);
    } catch (err) {
        logger.error('Failed to fetch public user data', {
            error: err,
            context: { userId: req.params.userId },
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

// Get current user's permissions (for RBAC)
router.get('/permissions', authenticateToken, async (req, res) => {
    try {
        const rbacService = require('../services/rbacService');
        const userId = req.user.id;

        const permissions = await rbacService.getUserPermissions(userId);

        res.json({ permissions });
    } catch (err) {
        logger.error('Failed to fetch user permissions', {
            error: err,
            context: { userId: req.user?.id },
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

// Get user profile with comprehensive stats
router.get('/stats/:userId', authenticateToken, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const cacheKey = `profile_stats_${userId}`;

        // Check cache first
        if (cache.has(cacheKey)) {
            return res.json(cache.get(cacheKey));
        }

        // Get all stats in parallel
        const [
            userStats,
            categoryStats,
            rank,
            improvementRate,
            difficultyDist
        ] = await Promise.all([
            analyticsService.getUserStats(userId),
            analyticsService.getCategoryStats(userId),
            analyticsService.getUserRank(userId),
            analyticsService.getImprovementRate(userId),
            analyticsService.getDifficultyDistribution(userId)
        ]);

        const result = {
            userStats,
            categoryStats,
            rank,
            improvementRate,
            difficultyDist
        };

        // Cache for 1 minute
        cache.set(cacheKey, result, 60 * 1000);

        res.json(result);
    } catch (err) {
        logger.error('Failed to fetch profile stats', {
            error: err,
            context: { userId: req.params.userId },
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

// Get activity heatmap data
router.get('/activity/:userId', authenticateToken, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);

        const [heatmapData, recentAttempts] = await Promise.all([
            analyticsService.getActivityHeatmap(userId),
            analyticsService.getRecentAttempts(userId, 10)
        ]);

        res.json({
            heatmap: heatmapData,
            recentAttempts
        });
    } catch (err) {
        logger.error('Failed to fetch activity data', {
            error: err,
            context: { userId: req.params.userId },
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

// Get performance trends
router.get('/trends/:userId', authenticateToken, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const days = parseInt(req.query.days) || 30;

        const trends = await analyticsService.getPerformanceTrends(userId, days);

        res.json({ trends });
    } catch (err) {
        logger.error('Failed to fetch performance trends', {
            error: err,
            context: { userId: req.params.userId, days: req.query.days },
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

// Get achievements
router.get('/achievements/:userId', authenticateToken, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);

        const achievementProgress = await achievementService.getAchievementProgress(userId);

        // Separate unlocked and locked achievements
        const unlocked = achievementProgress.filter(a => a.unlocked);
        const locked = achievementProgress.filter(a => !a.unlocked);

        res.json({
            unlocked,
            locked,
            totalAchievements: achievementProgress.length,
            unlockedCount: unlocked.length
        });
    } catch (err) {
        logger.error('Failed to fetch achievements', {
            error: err,
            context: { userId: req.params.userId },
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

// Get personalized recommendations
router.get('/recommendations/:userId', authenticateToken, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);

        const recommendations = await analyticsService.getRecommendations(userId);

        res.json({ recommendations });
    } catch (err) {
        logger.error('Failed to fetch recommendations', {
            error: err,
            context: { userId: req.params.userId },
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

// Compare with another user
router.get('/compare/:userId/:compareUserId', authenticateToken, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const compareUserId = parseInt(req.params.compareUserId);

        const [user1Stats, user2Stats, user1Rank, user2Rank] = await Promise.all([
            analyticsService.getUserStats(userId),
            analyticsService.getUserStats(compareUserId),
            analyticsService.getUserRank(userId),
            analyticsService.getUserRank(compareUserId)
        ]);

        res.json({
            user1: { ...user1Stats, rank: user1Rank },
            user2: { ...user2Stats, rank: user2Rank },
            comparison: {
                quizzesDiff: user1Stats.totalQuizzes - user2Stats.totalQuizzes,
                scoreDiff: user1Stats.avgScore - user2Stats.avgScore,
                rankDiff: user1Rank.rank - user2Rank.rank
            }
        });
    } catch (err) {
        logger.error('Failed to compare users', {
            error: err,
            context: { userId: req.params.userId, compareUserId: req.params.compareUserId },
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

// Update user avatar
router.put('/avatar', authenticateToken, async (req, res) => {
    try {
        const UserRepository = require('../repositories/UserRepository');
        const userId = req.user.id;
        const { avatarUrl } = req.body;

        const updated = await UserRepository.updateAvatar(userId, avatarUrl);

        if (!updated) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'Avatar updated successfully', avatarUrl });
    } catch (err) {
        logger.error('Failed to update avatar', {
            error: err,
            context: { userId: req.user.id },
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});


// Delete user account
router.delete('/', authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        const UserRepository = require('../repositories/UserRepository');

        const deleted = await UserRepository.deleteUser(userId);

        if (!deleted) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'Account deleted successfully' });
    } catch (err) {
        logger.error('Failed to delete user account', {
            error: err,
            context: { userId },
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});


module.exports = router;
