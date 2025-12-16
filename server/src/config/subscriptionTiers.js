/**
 * Subscription Tier Configuration
 * Defines limits and features for each subscription tier
 */

const SUBSCRIPTION_TIERS = {
    free: {
        name: 'Free',
        price: 0,
        currency: 'INR',
        limits: {
            aiQuizGeneration: 3,
            documentQuizGeneration: 2,
            videoQuizGeneration: 1,
            maxGroupPlayers: 8,
            quizPublishing: 10
        },
        features: {
            manualQuizzes: true,
            unlimitedAttempts: true,
            challenges1v1: true,
            groupChallenges: true,
            analytics: 'basic',
            achievements: true,
            leaderboards: true,
            pdfExport: false,
            priorityProcessing: false,
            prioritySupport: false,
            earlyAccess: false
        }
    },
    premium: {
        name: 'Premium',
        price: 499,
        currency: 'INR',
        limits: {
            aiQuizGeneration: 100,
            documentQuizGeneration: 50,
            videoQuizGeneration: 25,
            maxGroupPlayers: 100,
            quizPublishing: -1 // -1 means unlimited
        },
        features: {
            manualQuizzes: true,
            unlimitedAttempts: true,
            challenges1v1: true,
            groupChallenges: true,
            analytics: 'advanced',
            achievements: true,
            leaderboards: true,
            pdfExport: true,
            priorityProcessing: true,
            prioritySupport: true,
            earlyAccess: true
        }
    }
};


/**
 * Get tier configuration
 * @param {string} tierName - Tier name (free, pro, premium)
 * @returns {object} Tier configuration
 */
function getTierConfig(tierName) {
    const tier = SUBSCRIPTION_TIERS[tierName?.toLowerCase()];
    if (!tier) {
        return SUBSCRIPTION_TIERS.free; // Default to free
    }
    return tier;
}

/**
 * Get limit for specific generation type
 * @param {string} tierName - Tier name
 * @param {string} generationType - Type (aiQuizGeneration, documentQuizGeneration, videoQuizGeneration)
 * @returns {number} Limit for that generation type
 */
function getLimit(tierName, generationType) {
    const tier = getTierConfig(tierName);
    return tier.limits[generationType] || 0;
}

/**
 * Check if tier has feature
 * @param {string} tierName - Tier name
 * @param {string} featureName - Feature name
 * @returns {boolean} Whether tier has feature
 */
function hasFeature(tierName, featureName) {
    const tier = getTierConfig(tierName);
    return !!tier.features[featureName];
}

/**
 * Get all tier names
 * @returns {string[]} Array of tier names
 */
function getAllTiers() {
    return Object.keys(SUBSCRIPTION_TIERS);
}

/**
 * Validate tier name
 * @param {string} tierName - Tier name to validate
 * @returns {boolean} Whether tier name is valid
 */
function isValidTier(tierName) {
    return SUBSCRIPTION_TIERS.hasOwnProperty(tierName?.toLowerCase());
}

module.exports = {
    SUBSCRIPTION_TIERS,
    getTierConfig,
    getLimit,
    hasFeature,
    getAllTiers,
    isValidTier
};
