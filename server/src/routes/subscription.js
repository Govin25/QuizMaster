const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
    getSubscription,
    updateSubscriptionTier,
    cancelSubscription,
    getSubscriptionHistory,
    getUsersByTier
} = require('../services/subscriptionService');
const { getAllTiers, isValidTier, getTierConfig } = require('../config/subscriptionTiers');

/**
 * GET /api/subscription
 * Get subscription details for authenticated user
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const subscription = await getSubscription(userId);

        res.json({
            success: true,
            data: subscription
        });
    } catch (error) {
        console.error('Error getting subscription:', error);
        res.status(500).json({
            error: 'Failed to get subscription',
            message: error.message
        });
    }
});

/**
 * GET /api/subscription/tiers
 * Get all available subscription tiers
 */
router.get('/tiers', async (req, res) => {
    try {
        const tiers = getAllTiers().map(tierName => {
            const config = getTierConfig(tierName);
            return {
                tier: tierName,
                name: config.name,
                price: config.price,
                limits: config.limits,
                features: config.features
            };
        });

        res.json({
            success: true,
            data: {
                tiers,
                count: tiers.length
            }
        });
    } catch (error) {
        console.error('Error getting tiers:', error);
        res.status(500).json({
            error: 'Failed to get tiers',
            message: error.message
        });
    }
});

/**
 * POST /api/subscription/upgrade
 * Upgrade subscription tier (admin only for now, will integrate with Stripe later)
 */
router.post('/upgrade', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { tier, reason } = req.body;

        if (!tier) {
            return res.status(400).json({
                error: 'Missing tier',
                message: 'Please specify the tier to upgrade to'
            });
        }

        if (!isValidTier(tier)) {
            return res.status(400).json({
                error: 'Invalid tier',
                message: `Tier must be one of: ${getAllTiers().join(', ')}`
            });
        }

        // For now, only admins can manually upgrade users
        // Later, this will be handled by Stripe webhooks
        if (req.user.role !== 'admin' && req.user.id !== userId) {
            return res.status(403).json({
                error: 'Unauthorized',
                message: 'Subscription upgrades are coming soon! Please contact support.'
            });
        }

        const targetUserId = req.body.userId || userId;
        const updateReason = reason || (req.user.role === 'admin' ? 'admin_upgrade' : 'user_upgrade');

        const updated = await updateSubscriptionTier(targetUserId, tier, updateReason);

        res.json({
            success: true,
            message: `Successfully upgraded to ${updated.tierName}`,
            data: updated
        });
    } catch (error) {
        console.error('Error upgrading subscription:', error);
        res.status(500).json({
            error: 'Failed to upgrade subscription',
            message: error.message
        });
    }
});

/**
 * POST /api/subscription/cancel
 * Cancel subscription (downgrade to free)
 */
router.post('/cancel', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { reason } = req.body;

        const updated = await cancelSubscription(userId, reason || 'user_cancelled');

        res.json({
            success: true,
            message: 'Subscription cancelled successfully. You have been downgraded to the Free plan.',
            data: updated
        });
    } catch (error) {
        console.error('Error cancelling subscription:', error);
        res.status(500).json({
            error: 'Failed to cancel subscription',
            message: error.message
        });
    }
});

/**
 * GET /api/subscription/history
 * Get subscription change history for authenticated user
 */
router.get('/history', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 10;

        const history = await getSubscriptionHistory(userId, limit);

        res.json({
            success: true,
            data: {
                history,
                count: history.length
            }
        });
    } catch (error) {
        console.error('Error getting subscription history:', error);
        res.status(500).json({
            error: 'Failed to get subscription history',
            message: error.message
        });
    }
});

/**
 * GET /api/subscription/users
 * Get all users by tier (admin only)
 */
router.get('/users', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                error: 'Unauthorized',
                message: 'Only admins can view user subscriptions'
            });
        }

        const tier = req.query.tier;
        const users = await getUsersByTier(tier);

        res.json({
            success: true,
            data: {
                users,
                count: users.length,
                tier: tier || 'all'
            }
        });
    } catch (error) {
        console.error('Error getting users by tier:', error);
        res.status(500).json({
            error: 'Failed to get users',
            message: error.message
        });
    }
});

module.exports = router;
