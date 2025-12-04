const db = require('../db');
const { getTierConfig, isValidTier } = require('../config/subscriptionTiers');

/**
 * Get user's subscription details
 * @param {number} userId - User ID
 * @returns {Promise<object>} Subscription details
 */
async function getSubscription(userId) {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT subscription_tier, subscription_status, subscription_start_date, 
                    subscription_end_date, stripe_customer_id, stripe_subscription_id
             FROM users WHERE id = ?`,
            [userId],
            (err, row) => {
                if (err) {
                    reject(err);
                } else if (!row) {
                    reject(new Error('User not found'));
                } else {
                    const tier = row.subscription_tier || 'free';
                    const tierConfig = getTierConfig(tier);

                    resolve({
                        tier,
                        tierName: tierConfig.name,
                        price: tierConfig.price,
                        status: row.subscription_status || 'active',
                        startDate: row.subscription_start_date,
                        endDate: row.subscription_end_date,
                        stripeCustomerId: row.stripe_customer_id,
                        stripeSubscriptionId: row.stripe_subscription_id,
                        limits: tierConfig.limits,
                        features: tierConfig.features
                    });
                }
            }
        );
    });
}

/**
 * Update user's subscription tier
 * @param {number} userId - User ID
 * @param {string} newTier - New tier (free, pro, premium)
 * @param {string} reason - Reason for change
 * @returns {Promise<object>} Updated subscription
 */
async function updateSubscriptionTier(userId, newTier, reason = 'manual_update') {
    if (!isValidTier(newTier)) {
        throw new Error(`Invalid tier: ${newTier}`);
    }

    return new Promise(async (resolve, reject) => {
        try {
            // Get current tier for history
            const currentSub = await getSubscription(userId);
            const oldTier = currentSub.tier;

            // Update subscription
            db.run(
                `UPDATE users 
                 SET subscription_tier = ?,
                     subscription_status = 'active',
                     subscription_start_date = COALESCE(subscription_start_date, CURRENT_TIMESTAMP)
                 WHERE id = ?`,
                [newTier, userId],
                async function (err) {
                    if (err) {
                        reject(err);
                    } else {
                        // Log to subscription history
                        await logSubscriptionChange(userId, oldTier, newTier, reason);

                        // Get updated subscription
                        const updated = await getSubscription(userId);
                        resolve(updated);
                    }
                }
            );
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Cancel user's subscription (downgrade to free)
 * @param {number} userId - User ID
 * @param {string} reason - Reason for cancellation
 * @returns {Promise<object>} Updated subscription
 */
async function cancelSubscription(userId, reason = 'user_cancelled') {
    return new Promise(async (resolve, reject) => {
        try {
            const currentSub = await getSubscription(userId);

            db.run(
                `UPDATE users 
                 SET subscription_tier = 'free',
                     subscription_status = 'cancelled',
                     subscription_end_date = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [userId],
                async function (err) {
                    if (err) {
                        reject(err);
                    } else {
                        // Log to subscription history
                        await logSubscriptionChange(userId, currentSub.tier, 'free', reason);

                        // Get updated subscription
                        const updated = await getSubscription(userId);
                        resolve(updated);
                    }
                }
            );
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Log subscription change to history
 * @param {number} userId - User ID
 * @param {string} fromTier - Previous tier
 * @param {string} toTier - New tier
 * @param {string} reason - Reason for change
 * @returns {Promise<void>}
 */
async function logSubscriptionChange(userId, fromTier, toTier, reason) {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO subscription_history (user_id, from_tier, to_tier, reason)
             VALUES (?, ?, ?, ?)`,
            [userId, fromTier, toTier, reason],
            (err) => {
                if (err) {
                    console.error('Error logging subscription change:', err);
                    // Don't reject - logging failure shouldn't break the flow
                    resolve();
                } else {
                    resolve();
                }
            }
        );
    });
}

/**
 * Get subscription change history for a user
 * @param {number} userId - User ID
 * @param {number} limit - Number of records to retrieve
 * @returns {Promise<array>} Array of subscription changes
 */
async function getSubscriptionHistory(userId, limit = 10) {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT * FROM subscription_history 
             WHERE user_id = ? 
             ORDER BY changed_at DESC 
             LIMIT ?`,
            [userId, limit],
            (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    const history = rows.map(row => ({
                        id: row.id,
                        fromTier: row.from_tier,
                        toTier: row.to_tier,
                        changedAt: row.changed_at,
                        reason: row.reason
                    }));
                    resolve(history);
                }
            }
        );
    });
}

/**
 * Check if user has access to a feature
 * @param {number} userId - User ID
 * @param {string} featureName - Feature name
 * @returns {Promise<boolean>} Whether user has access
 */
async function hasFeatureAccess(userId, featureName) {
    try {
        const subscription = await getSubscription(userId);
        return !!subscription.features[featureName];
    } catch (error) {
        console.error('Error checking feature access:', error);
        return false;
    }
}

/**
 * Get all users by subscription tier (admin only)
 * @param {string} tier - Tier to filter by (optional)
 * @returns {Promise<array>} Array of users
 */
async function getUsersByTier(tier = null) {
    return new Promise((resolve, reject) => {
        let query = `SELECT id, username, email, subscription_tier, subscription_status, 
                            subscription_start_date FROM users`;
        let params = [];

        if (tier && isValidTier(tier)) {
            query += ` WHERE subscription_tier = ?`;
            params.push(tier);
        }

        query += ` ORDER BY subscription_start_date DESC`;

        db.all(query, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

module.exports = {
    getSubscription,
    updateSubscriptionTier,
    cancelSubscription,
    logSubscriptionChange,
    getSubscriptionHistory,
    hasFeatureAccess,
    getUsersByTier
};
