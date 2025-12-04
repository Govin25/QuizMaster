const db = require('../db');
const { getLimit } = require('../config/subscriptionTiers');

/**
 * Get current month in YYYY-MM format
 * @returns {string} Current month
 */
function getCurrentMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

/**
 * Get user's current month usage
 * @param {number} userId - User ID
 * @returns {Promise<object>} Usage data
 */
async function getCurrentUsage(userId) {
    return new Promise((resolve, reject) => {
        const currentMonth = getCurrentMonth();

        db.get(
            `SELECT * FROM user_usage WHERE user_id = ? AND month = ?`,
            [userId, currentMonth],
            (err, row) => {
                if (err) {
                    reject(err);
                } else if (row) {
                    resolve({
                        month: row.month,
                        aiQuizCount: row.ai_quiz_count,
                        documentQuizCount: row.document_quiz_count,
                        videoQuizCount: row.video_quiz_count,
                        updatedAt: row.updated_at
                    });
                } else {
                    // No usage record yet for this month
                    resolve({
                        month: currentMonth,
                        aiQuizCount: 0,
                        documentQuizCount: 0,
                        videoQuizCount: 0,
                        updatedAt: null
                    });
                }
            }
        );
    });
}

/**
 * Get user's usage with limits based on their tier
 * @param {number} userId - User ID
 * @param {string} userTier - User's subscription tier
 * @returns {Promise<object>} Usage data with limits
 */
async function getUsageWithLimits(userId, userTier) {
    const usage = await getCurrentUsage(userId);

    return {
        month: usage.month,
        aiQuiz: {
            used: usage.aiQuizCount,
            limit: getLimit(userTier, 'aiQuizGeneration'),
            remaining: Math.max(0, getLimit(userTier, 'aiQuizGeneration') - usage.aiQuizCount)
        },
        documentQuiz: {
            used: usage.documentQuizCount,
            limit: getLimit(userTier, 'documentQuizGeneration'),
            remaining: Math.max(0, getLimit(userTier, 'documentQuizGeneration') - usage.documentQuizCount)
        },
        videoQuiz: {
            used: usage.videoQuizCount,
            limit: getLimit(userTier, 'videoQuizGeneration'),
            remaining: Math.max(0, getLimit(userTier, 'videoQuizGeneration') - usage.videoQuizCount)
        }
    };
}

/**
 * Increment usage counter for a generation type
 * @param {number} userId - User ID
 * @param {string} generationType - Type (aiQuizGeneration, documentQuizGeneration, videoQuizGeneration)
 * @returns {Promise<void>}
 */
async function incrementUsage(userId, generationType) {
    return new Promise((resolve, reject) => {
        const currentMonth = getCurrentMonth();

        // Map generation type to column name
        const columnMap = {
            aiQuizGeneration: 'ai_quiz_count',
            documentQuizGeneration: 'document_quiz_count',
            videoQuizGeneration: 'video_quiz_count'
        };

        const column = columnMap[generationType];
        if (!column) {
            return reject(new Error(`Invalid generation type: ${generationType}`));
        }

        // Use INSERT OR REPLACE to handle both new and existing records
        db.run(
            `INSERT INTO user_usage (user_id, month, ${column}, updated_at)
             VALUES (?, ?, 1, CURRENT_TIMESTAMP)
             ON CONFLICT(user_id, month) 
             DO UPDATE SET 
                ${column} = ${column} + 1,
                updated_at = CURRENT_TIMESTAMP`,
            [userId, currentMonth],
            function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            }
        );
    });
}

/**
 * Check if user has exceeded limit for a generation type
 * @param {number} userId - User ID
 * @param {string} userTier - User's subscription tier
 * @param {string} generationType - Type of generation
 * @returns {Promise<object>} { exceeded: boolean, current: number, limit: number }
 */
async function checkLimit(userId, userTier, generationType) {
    const usage = await getCurrentUsage(userId);
    const limit = getLimit(userTier, generationType);

    const columnMap = {
        aiQuizGeneration: 'aiQuizCount',
        documentQuizGeneration: 'documentQuizCount',
        videoQuizGeneration: 'videoQuizCount'
    };

    const current = usage[columnMap[generationType]] || 0;

    return {
        exceeded: current >= limit,
        current,
        limit,
        remaining: Math.max(0, limit - current)
    };
}

/**
 * Get usage history for a user
 * @param {number} userId - User ID
 * @param {number} months - Number of months to retrieve (default 6)
 * @returns {Promise<array>} Array of usage records
 */
async function getUsageHistory(userId, months = 6) {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT * FROM user_usage 
             WHERE user_id = ? 
             ORDER BY month DESC 
             LIMIT ?`,
            [userId, months],
            (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    const history = rows.map(row => ({
                        month: row.month,
                        aiQuizCount: row.ai_quiz_count,
                        documentQuizCount: row.document_quiz_count,
                        videoQuizCount: row.video_quiz_count,
                        total: row.ai_quiz_count + row.document_quiz_count + row.video_quiz_count,
                        updatedAt: row.updated_at
                    }));
                    resolve(history);
                }
            }
        );
    });
}

/**
 * Reset usage for testing purposes (admin only)
 * @param {number} userId - User ID
 * @returns {Promise<void>}
 */
async function resetUsage(userId) {
    return new Promise((resolve, reject) => {
        const currentMonth = getCurrentMonth();

        db.run(
            `DELETE FROM user_usage WHERE user_id = ? AND month = ?`,
            [userId, currentMonth],
            (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            }
        );
    });
}

module.exports = {
    getCurrentMonth,
    getCurrentUsage,
    getUsageWithLimits,
    incrementUsage,
    checkLimit,
    getUsageHistory,
    resetUsage
};
