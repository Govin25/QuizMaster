/**
 * Analytics Service
 * Calculates user statistics and performance metrics
 */

const db = require('../db');

class AnalyticsService {
    /**
     * Get comprehensive user statistics
     */
    async getUserStats(userId) {
        return new Promise((resolve, reject) => {
            const query = `
        SELECT 
          COALESCE(us.total_quizzes, 0) as totalQuizzes,
          COALESCE(us.best_score, 0) as bestScore,
          COALESCE(us.current_streak, 0) as currentStreak,
          COALESCE(us.longest_streak, 0) as longestStreak,
          COALESCE(us.total_time_seconds, 0) as totalTimeSeconds,
          CASE WHEN COALESCE(us.total_quizzes, 0) > 0 
            THEN ROUND(CAST(us.total_score AS FLOAT) / us.total_quizzes, 2)
            ELSE 0 
          END as avgScore,
          (SELECT COUNT(*) FROM results WHERE user_id = ? AND score = 100) as perfectScores,
          (SELECT COUNT(DISTINCT quiz_id) FROM results WHERE user_id = ?) as uniqueQuizzes,
          u.level,
          u.xp,
          u.created_at as joinedAt
        FROM users u
        LEFT JOIN user_stats us ON u.id = us.user_id
        WHERE u.id = ?
      `;

            db.get(query, [userId, userId, userId], (err, row) => {
                if (err) return reject(err);
                resolve(row || {});
            });
        });
    }

    /**
     * Get category-wise performance
     */
    async getCategoryStats(userId) {
        return new Promise((resolve, reject) => {
            const query = `
        SELECT 
          q.category,
          COUNT(DISTINCT r.quiz_id) as quizzesCompleted,
          ROUND(AVG(r.score), 2) as avgScore,
          MAX(r.score) as bestScore,
          MIN(r.score) as worstScore,
          COUNT(r.id) as totalAttempts
        FROM results r
        JOIN quizzes q ON r.quiz_id = q.id
        WHERE r.user_id = ?
        GROUP BY q.category
        ORDER BY avgScore DESC
      `;

            db.all(query, [userId], (err, rows) => {
                if (err) return reject(err);

                // Calculate mastery level (0-100%)
                const categoriesWithMastery = rows.map(cat => ({
                    ...cat,
                    masteryLevel: Math.min(100, Math.round((cat.avgScore / 100) * 100)),
                    isMastered: cat.avgScore >= 90,
                    needsImprovement: cat.avgScore < 60
                }));

                resolve(categoriesWithMastery);
            });
        });
    }

    /**
     * Get performance trends over time
     */
    async getPerformanceTrends(userId, days = 30) {
        return new Promise((resolve, reject) => {
            const query = `
        SELECT 
          DATE(completed_at) as date,
          ROUND(AVG(score), 2) as avgScore,
          COUNT(*) as quizCount,
          MAX(score) as bestScore
        FROM results
        WHERE user_id = ? 
          AND completed_at >= datetime('now', '-${days} days')
        GROUP BY DATE(completed_at)
        ORDER BY date ASC
      `;

            db.all(query, [userId], (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });
    }

    /**
     * Get activity heatmap data (last 365 days)
     */
    async getActivityHeatmap(userId) {
        return new Promise((resolve, reject) => {
            const query = `
        SELECT 
          DATE(completed_at) as date,
          COUNT(*) as count
        FROM results
        WHERE user_id = ? 
          AND completed_at >= datetime('now', '-365 days')
        GROUP BY DATE(completed_at)
        ORDER BY date ASC
      `;

            db.all(query, [userId], (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });
    }

    /**
     * Get recent quiz attempts
     */
    async getRecentAttempts(userId, limit = 10) {
        return new Promise((resolve, reject) => {
            const query = `
        SELECT 
          r.id,
          r.quiz_id,
          r.score,
          r.completed_at,
          q.title as quizTitle,
          q.category,
          q.difficulty,
          (SELECT COUNT(*) FROM questions WHERE quiz_id = q.id) as questionCount
        FROM results r
        JOIN quizzes q ON r.quiz_id = q.id
        WHERE r.user_id = ?
        ORDER BY r.completed_at DESC
        LIMIT ?
      `;

            db.all(query, [userId, limit], (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });
    }

    /**
     * Get difficulty distribution
     */
    async getDifficultyDistribution(userId) {
        return new Promise((resolve, reject) => {
            const query = `
        SELECT 
          q.difficulty,
          COUNT(DISTINCT r.quiz_id) as count,
          ROUND(AVG(r.score), 2) as avgScore
        FROM results r
        JOIN quizzes q ON r.quiz_id = q.id
        WHERE r.user_id = ?
        GROUP BY q.difficulty
      `;

            db.all(query, [userId], (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });
    }

    /**
     * Get user rank
     */
    async getUserRank(userId) {
        return new Promise((resolve, reject) => {
            const query = `
        WITH user_scores AS (
          SELECT 
            user_id,
            CASE WHEN total_quizzes > 0 
              THEN CAST(total_score AS FLOAT) / total_quizzes 
              ELSE 0 
            END as avg_score
          FROM user_stats
        ),
        ranked_users AS (
          SELECT 
            user_id,
            avg_score,
            ROW_NUMBER() OVER (ORDER BY avg_score DESC, user_id ASC) as rank
          FROM user_scores
        )
        SELECT 
          rank,
          avg_score,
          (SELECT COUNT(*) FROM user_stats) as totalUsers
        FROM ranked_users
        WHERE user_id = ?
      `;

            db.get(query, [userId], (err, row) => {
                if (err) return reject(err);
                if (!row) {
                    return resolve({ rank: null, avgScore: 0, totalUsers: 0, percentile: 0 });
                }

                const percentile = row.totalUsers > 0
                    ? Math.round((1 - (row.rank - 1) / row.totalUsers) * 100)
                    : 0;

                resolve({
                    rank: row.rank,
                    avgScore: row.avg_score,
                    totalUsers: row.totalUsers,
                    percentile
                });
            });
        });
    }

    /**
     * Update user stats after quiz completion
     */
    async updateUserStats(userId, quizScore, timeTaken) {
        return new Promise((resolve, reject) => {
            // First, ensure user_stats record exists
            db.run(
                `INSERT OR IGNORE INTO user_stats (user_id) VALUES (?)`,
                [userId],
                (err) => {
                    if (err) return reject(err);

                    // Update stats
                    const updateQuery = `
            UPDATE user_stats
            SET 
              total_quizzes = total_quizzes + 1,
              total_score = total_score + ?,
              best_score = MAX(best_score, ?),
              total_time_seconds = total_time_seconds + ?,
              last_active_date = DATE('now')
            WHERE user_id = ?
          `;

                    db.run(updateQuery, [quizScore, quizScore, timeTaken, userId], function (err) {
                        if (err) return reject(err);
                        resolve({ updated: this.changes > 0 });
                    });
                }
            );
        });
    }

    /**
     * Update streak
     */
    async updateStreak(userId) {
        return new Promise((resolve, reject) => {
            const query = `
        SELECT last_active_date, current_streak, longest_streak
        FROM user_stats
        WHERE user_id = ?
      `;

            db.get(query, [userId], (err, row) => {
                if (err) return reject(err);
                if (!row) return resolve({ streak: 0 });

                const today = new Date().toISOString().split('T')[0];
                const lastActive = row.last_active_date;

                let newStreak = 1;
                if (lastActive) {
                    const lastDate = new Date(lastActive);
                    const todayDate = new Date(today);
                    const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

                    if (diffDays === 0) {
                        // Same day, keep current streak
                        newStreak = row.current_streak;
                    } else if (diffDays === 1) {
                        // Consecutive day, increment streak
                        newStreak = row.current_streak + 1;
                    }
                    // else: streak broken, reset to 1
                }

                const newLongestStreak = Math.max(row.longest_streak || 0, newStreak);

                db.run(
                    `UPDATE user_stats 
           SET current_streak = ?, longest_streak = ?, last_active_date = DATE('now')
           WHERE user_id = ?`,
                    [newStreak, newLongestStreak, userId],
                    function (err) {
                        if (err) return reject(err);
                        resolve({ streak: newStreak, longestStreak: newLongestStreak });
                    }
                );
            });
        });
    }

    /**
     * Get improvement rate (last 30 days vs previous 30 days)
     */
    async getImprovementRate(userId) {
        return new Promise((resolve, reject) => {
            const query = `
        SELECT 
          AVG(CASE WHEN completed_at >= datetime('now', '-30 days') THEN score END) as recent_avg,
          AVG(CASE WHEN completed_at < datetime('now', '-30 days') 
                   AND completed_at >= datetime('now', '-60 days') THEN score END) as previous_avg
        FROM results
        WHERE user_id = ?
      `;

            db.get(query, [userId], (err, row) => {
                if (err) return reject(err);

                const recentAvg = row.recent_avg || 0;
                const previousAvg = row.previous_avg || 0;
                const improvement = previousAvg > 0
                    ? ((recentAvg - previousAvg) / previousAvg) * 100
                    : 0;

                resolve({
                    recentAvg: Math.round(recentAvg * 100) / 100,
                    previousAvg: Math.round(previousAvg * 100) / 100,
                    improvementRate: Math.round(improvement * 100) / 100
                });
            });
        });
    }

    /**
     * Get personalized recommendations
     */
    async getRecommendations(userId) {
        const categoryStats = await this.getCategoryStats(userId);
        const stats = await this.getUserStats(userId);

        const recommendations = [];

        // Weak categories
        const weakCategories = categoryStats.filter(c => c.needsImprovement);
        if (weakCategories.length > 0) {
            recommendations.push({
                type: 'improve',
                title: 'Strengthen Your Weak Areas',
                categories: weakCategories.map(c => c.category),
                message: `Focus on ${weakCategories[0].category} to improve your overall performance`
            });
        }

        // Almost mastered categories
        const almostMastered = categoryStats.filter(c => c.avgScore >= 80 && c.avgScore < 90);
        if (almostMastered.length > 0) {
            recommendations.push({
                type: 'master',
                title: 'Close to Mastery!',
                categories: almostMastered.map(c => c.category),
                message: `You're almost there! A few more quizzes in ${almostMastered[0].category} to master it`
            });
        }

        // Challenge yourself
        if (stats.avgScore >= 85) {
            recommendations.push({
                type: 'challenge',
                title: 'Challenge Yourself',
                message: 'Try harder difficulty levels to push your limits'
            });
        }

        return recommendations;
    }
}

module.exports = new AnalyticsService();
