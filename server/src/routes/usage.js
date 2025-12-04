const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { getUsageWithLimits, getUsageHistory, resetUsage } = require('../services/usageService');
const { getSubscription } = require('../services/subscriptionService');

/**
 * GET /api/usage/current
 * Get current month usage and limits for authenticated user
 */
router.get('/current', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get user's subscription to know their tier
        const subscription = await getSubscription(userId);

        // Get usage with limits
        const usage = await getUsageWithLimits(userId, subscription.tier);

        res.json({
            success: true,
            data: {
                month: usage.month,
                tier: subscription.tier,
                tierName: subscription.tierName,
                usage: {
                    aiQuiz: usage.aiQuiz,
                    documentQuiz: usage.documentQuiz,
                    videoQuiz: usage.videoQuiz
                },
                totalUsed: usage.aiQuiz.used + usage.documentQuiz.used + usage.videoQuiz.used,
                totalLimit: usage.aiQuiz.limit + usage.documentQuiz.limit + usage.videoQuiz.limit
            }
        });
    } catch (error) {
        console.error('Error getting current usage:', error);
        res.status(500).json({
            error: 'Failed to get usage',
            message: error.message
        });
    }
});

/**
 * GET /api/usage/history
 * Get usage history for authenticated user
 */
router.get('/history', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const months = parseInt(req.query.months) || 6;

        if (months < 1 || months > 12) {
            return res.status(400).json({
                error: 'Invalid months parameter',
                message: 'Months must be between 1 and 12'
            });
        }

        const history = await getUsageHistory(userId, months);

        res.json({
            success: true,
            data: {
                history,
                count: history.length
            }
        });
    } catch (error) {
        console.error('Error getting usage history:', error);
        res.status(500).json({
            error: 'Failed to get usage history',
            message: error.message
        });
    }
});

/**
 * POST /api/usage/reset
 * Reset current month usage (admin only or for testing)
 */
router.post('/reset', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Only allow admins to reset usage
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                error: 'Unauthorized',
                message: 'Only admins can reset usage'
            });
        }

        const targetUserId = req.body.userId || userId;

        await resetUsage(targetUserId);

        res.json({
            success: true,
            message: 'Usage reset successfully',
            data: {
                userId: targetUserId
            }
        });
    } catch (error) {
        console.error('Error resetting usage:', error);
        res.status(500).json({
            error: 'Failed to reset usage',
            message: error.message
        });
    }
});

module.exports = router;
