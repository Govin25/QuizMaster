/**
 * Subscription Tier Configuration
 * Defines limits and features for each subscription tier
 */

const SUBSCRIPTION_TIERS = {
    free: {
        name: 'Free',
        price: 0,
        limits: {
            aiQuizGeneration: 5,
            documentQuizGeneration: 3,
            videoQuizGeneration: 2
        },
        features: {
            manualQuizzes: true,
            unlimitedAttempts: true,
            challenges: true,
            analytics: 'basic',
            pdfExport: false,
            customBranding: false,
            prioritySupport: false,
            priorityProcessing: false
        }
    },
    pro: {
        name: 'Pro',
        price: 9,
        limits: {
            aiQuizGeneration: 50,
            documentQuizGeneration: 30,
            videoQuizGeneration: 20
        },
        features: {
            manualQuizzes: true,
            unlimitedAttempts: true,
            challenges: true,
            analytics: 'advanced',
            pdfExport: true,
            customBranding: true,
            prioritySupport: true,
            priorityProcessing: true
        }
    },
    premium: {
        name: 'Premium',
        price: 19,
        limits: {
            aiQuizGeneration: 200,
            documentQuizGeneration: 100,
            videoQuizGeneration: 75
        },
        features: {
            manualQuizzes: true,
            unlimitedAttempts: true,
            challenges: true,
            analytics: 'advanced',
            pdfExport: true,
            customBranding: true,
            prioritySupport: true,
            priorityProcessing: true,
            bulkGeneration: true,
            apiAccess: true,
            whiteLabel: true,
            teamCollaboration: true
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
