const { checkLimit } = require('../services/usageService');
const { getSubscription } = require('../services/subscriptionService');
const { getTierConfig } = require('../config/subscriptionTiers');

/**
 * Middleware to check if user has exceeded usage limit
 * @param {string} generationType - Type of generation (aiQuizGeneration, documentQuizGeneration, videoQuizGeneration)
 * @returns {Function} Express middleware
 */
function checkUsageLimit(generationType) {
    return async (req, res, next) => {
        try {
            const userId = req.user.id;

            // Get user's subscription
            const subscription = await getSubscription(userId);
            const userTier = subscription.tier;

            // Check current usage against limit
            const limitCheck = await checkLimit(userId, userTier, generationType);

            if (limitCheck.exceeded) {
                // User has exceeded their limit
                const tierConfig = getTierConfig(userTier);

                // Get upgrade options
                const upgradeOptions = [];
                if (userTier === 'free') {
                    upgradeOptions.push('pro', 'premium');
                } else if (userTier === 'pro') {
                    upgradeOptions.push('premium');
                }

                return res.status(403).json({
                    error: 'Monthly limit exceeded',
                    message: `You've used all ${limitCheck.limit} ${getGenerationTypeName(generationType)} for this month. ${getUpgradeMessage(userTier, upgradeOptions)}`,
                    details: {
                        generationType,
                        current: limitCheck.current,
                        limit: limitCheck.limit,
                        tier: userTier,
                        tierName: tierConfig.name,
                        upgradeOptions
                    }
                });
            }

            // User is within limit, attach usage info to request
            req.usageInfo = {
                generationType,
                current: limitCheck.current,
                limit: limitCheck.limit,
                remaining: limitCheck.remaining,
                tier: userTier
            };

            next();
        } catch (error) {
            console.error('Error checking usage limit:', error);
            res.status(500).json({
                error: 'Failed to check usage limit',
                message: 'An error occurred while checking your usage limit. Please try again.'
            });
        }
    };
}

/**
 * Get human-readable generation type name
 * @param {string} generationType - Generation type
 * @returns {string} Human-readable name
 */
function getGenerationTypeName(generationType) {
    const names = {
        aiQuizGeneration: 'AI quiz generations',
        documentQuizGeneration: 'document quiz generations',
        videoQuizGeneration: 'video quiz generations'
    };
    return names[generationType] || 'generations';
}

/**
 * Get upgrade message based on current tier
 * @param {string} currentTier - Current tier
 * @param {array} upgradeOptions - Available upgrade options
 * @returns {string} Upgrade message
 */
function getUpgradeMessage(currentTier, upgradeOptions) {
    if (upgradeOptions.length === 0) {
        return 'You are already on the highest tier!';
    }

    if (currentTier === 'free') {
        return 'Upgrade to Pro for 50/month or Premium for 200/month!';
    } else if (currentTier === 'pro') {
        return 'Upgrade to Premium for 200/month!';
    }

    return 'Consider upgrading for higher limits!';
}

/**
 * Middleware to check if user has feature access
 * @param {string} featureName - Feature name
 * @returns {Function} Express middleware
 */
function checkFeatureAccess(featureName) {
    return async (req, res, next) => {
        try {
            const userId = req.user.id;
            const subscription = await getSubscription(userId);

            if (!subscription.features[featureName]) {
                const tierConfig = getTierConfig(subscription.tier);

                return res.status(403).json({
                    error: 'Feature not available',
                    message: `The feature "${featureName}" is not available on your ${tierConfig.name} plan.`,
                    details: {
                        feature: featureName,
                        currentTier: subscription.tier,
                        requiresUpgrade: true
                    }
                });
            }

            next();
        } catch (error) {
            console.error('Error checking feature access:', error);
            res.status(500).json({
                error: 'Failed to check feature access',
                message: 'An error occurred while checking feature access. Please try again.'
            });
        }
    };
}

module.exports = {
    checkUsageLimit,
    checkFeatureAccess
};
