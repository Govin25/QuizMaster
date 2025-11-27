/**
 * Achievement Service
 * Manages user achievements and badges
 */

const db = require('../db');

// Achievement Definitions
const ACHIEVEMENTS = {
    // Completion Milestones
    FIRST_QUIZ: {
        id: 'first_quiz',
        name: 'First Steps',
        description: 'Complete your first quiz',
        icon: '🎯',
        category: 'milestone',
        criteria: { quizzes: 1 }
    },
    QUIZ_ENTHUSIAST: {
        id: 'quiz_enthusiast',
        name: 'Quiz Enthusiast',
        description: 'Complete 10 quizzes',
        icon: '🔥',
        category: 'milestone',
        criteria: { quizzes: 10 }
    },
    QUIZ_MASTER: {
        id: 'quiz_master',
        name: 'Quiz Master',
        description: 'Complete 50 quizzes',
        icon: '📚',
        category: 'milestone',
        criteria: { quizzes: 50 }
    },
    QUIZ_LEGEND: {
        id: 'quiz_legend',
        name: 'Quiz Legend',
        description: 'Complete 100 quizzes',
        icon: '🏆',
        category: 'milestone',
        criteria: { quizzes: 100 }
    },

    // Performance Achievements
    PERFECT_SCORE: {
        id: 'perfect_score',
        name: 'Perfect Score',
        description: 'Get 100% on any quiz',
        icon: '⭐',
        category: 'performance',
        criteria: { perfectScores: 1 }
    },
    PERFECTIONIST: {
        id: 'perfectionist',
        name: 'Perfectionist',
        description: 'Get 100% on 5 quizzes',
        icon: '🎖️',
        category: 'performance',
        criteria: { perfectScores: 5 }
    },
    ACE_STUDENT: {
        id: 'ace_student',
        name: 'Ace Student',
        description: 'Maintain 90%+ average score',
        icon: '🌟',
        category: 'performance',
        criteria: { avgScore: 90 }
    },
    ELITE_PERFORMER: {
        id: 'elite_performer',
        name: 'Elite Performer',
        description: 'Maintain 95%+ average score',
        icon: '💎',
        category: 'performance',
        criteria: { avgScore: 95 }
    },

    // Streak Achievements
    STREAK_3: {
        id: 'streak_3',
        name: '3-Day Streak',
        description: 'Complete quizzes for 3 days in a row',
        icon: '🔥',
        category: 'streak',
        criteria: { streak: 3 }
    },
    STREAK_7: {
        id: 'streak_7',
        name: '7-Day Streak',
        description: 'Complete quizzes for 7 days in a row',
        icon: '🔥',
        category: 'streak',
        criteria: { streak: 7 }
    },
    STREAK_30: {
        id: 'streak_30',
        name: '30-Day Streak',
        description: 'Complete quizzes for 30 days in a row',
        icon: '🔥',
        category: 'streak',
        criteria: { streak: 30 }
    },
    STREAK_100: {
        id: 'streak_100',
        name: '100-Day Streak',
        description: 'Complete quizzes for 100 days in a row',
        icon: '🔥',
        category: 'streak',
        criteria: { streak: 100 }
    },

    // Speed Achievements
    SPEED_DEMON: {
        id: 'speed_demon',
        name: 'Speed Demon',
        description: 'Complete a quiz in under 2 minutes',
        icon: '⚡',
        category: 'speed',
        criteria: { fastCompletion: 60 }
    },
    QUICK_THINKER: {
        id: 'quick_thinker',
        name: 'Quick Thinker',
        description: 'Average under 30 seconds per question',
        icon: '🏃',
        category: 'speed',
        criteria: { avgTimePerQuestion: 5 }
    }
};

class AchievementService {
    /**
     * Get all achievement definitions
     */
    getAllAchievements() {
        return Object.values(ACHIEVEMENTS);
    }

    /**
     * Get user's unlocked achievements
     */
    async getUserAchievements(userId) {
        return new Promise((resolve, reject) => {
            db.all(
                'SELECT achievement_id, unlocked_at FROM user_achievements WHERE user_id = ?',
                [userId],
                (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows);
                }
            );
        });
    }

    /**
     * Check and award achievements for a user
     */
    async checkAndAwardAchievements(userId) {
        try {
            // Get user stats
            const stats = await this.getUserStats(userId);
            const unlockedAchievements = await this.getUserAchievements(userId);
            const unlockedIds = new Set(unlockedAchievements.map(a => a.achievement_id));

            const newAchievements = [];

            // Check each achievement
            for (const achievement of Object.values(ACHIEVEMENTS)) {
                if (unlockedIds.has(achievement.id)) continue;

                if (this.checkCriteria(achievement, stats)) {
                    await this.awardAchievement(userId, achievement.id);
                    newAchievements.push(achievement);
                }
            }

            return newAchievements;
        } catch (error) {
            console.error('Error checking achievements:', error);
            return [];
        }
    }

    /**
     * Check if achievement criteria is met
     */
    checkCriteria(achievement, stats) {
        const { criteria } = achievement;

        if (criteria.quizzes && stats.total_quizzes >= criteria.quizzes) {
            return true;
        }

        if (criteria.perfectScores && stats.perfect_scores >= criteria.perfectScores) {
            return true;
        }

        if (criteria.avgScore && stats.avg_score >= criteria.avgScore) {
            return true;
        }

        if (criteria.streak && stats.current_streak >= criteria.streak) {
            return true;
        }

        if (criteria.fastCompletion && stats.fastest_completion <= criteria.fastCompletion) {
            return true;
        }

        if (criteria.avgTimePerQuestion && stats.avg_time_per_question <= criteria.avgTimePerQuestion) {
            return true;
        }

        return false;
    }

    /**
     * Award achievement to user
     */
    async awardAchievement(userId, achievementId) {
        return new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO user_achievements (user_id, achievement_id) VALUES (?, ?)',
                [userId, achievementId],
                function (err) {
                    if (err) {
                        if (err.message.includes('UNIQUE')) {
                            return resolve({ alreadyUnlocked: true });
                        }
                        return reject(err);
                    }
                    resolve({ id: this.lastID, achievementId });
                }
            );
        });
    }

    /**
     * Get user stats for achievement checking
     */
    async getUserStats(userId) {
        return new Promise((resolve, reject) => {
            const query = `
        SELECT 
          us.total_quizzes,
          us.current_streak,
          us.best_score,
          CASE WHEN us.total_quizzes > 0 
            THEN CAST(us.total_score AS FLOAT) / us.total_quizzes 
            ELSE 0 
          END as avg_score,
          (SELECT COUNT(*) FROM results WHERE user_id = ? AND score = 100) as perfect_scores,
          (SELECT MIN(r.completed_at - r2.completed_at) 
           FROM results r 
           JOIN results r2 ON r.quiz_id = r2.quiz_id AND r.user_id = r2.user_id 
           WHERE r.user_id = ? AND r.id > r2.id) as fastest_completion,
          CASE WHEN us.total_quizzes > 0 
            THEN CAST(us.total_time_seconds AS FLOAT) / (us.total_quizzes * 10) 
            ELSE 0 
          END as avg_time_per_question
        FROM user_stats us
        WHERE us.user_id = ?
      `;

            db.get(query, [userId, userId, userId], (err, row) => {
                if (err) return reject(err);
                resolve(row || {
                    total_quizzes: 0,
                    current_streak: 0,
                    best_score: 0,
                    avg_score: 0,
                    perfect_scores: 0,
                    fastest_completion: 999999,
                    avg_time_per_question: 999999
                });
            });
        });
    }

    /**
     * Get achievement progress for user
     */
    async getAchievementProgress(userId) {
        const stats = await this.getUserStats(userId);
        const unlocked = await this.getUserAchievements(userId);
        const unlockedIds = new Set(unlocked.map(a => a.achievement_id));

        return Object.values(ACHIEVEMENTS).map(achievement => {
            const isUnlocked = unlockedIds.has(achievement.id);
            const progress = this.calculateProgress(achievement, stats);

            return {
                ...achievement,
                unlocked: isUnlocked,
                unlockedAt: unlocked.find(a => a.achievement_id === achievement.id)?.unlocked_at,
                progress: isUnlocked ? 100 : progress
            };
        });
    }

    /**
     * Calculate progress toward achievement
     */
    calculateProgress(achievement, stats) {
        const { criteria } = achievement;

        if (criteria.quizzes) {
            return Math.min(100, (stats.total_quizzes / criteria.quizzes) * 100);
        }

        if (criteria.perfectScores) {
            return Math.min(100, (stats.perfect_scores / criteria.perfectScores) * 100);
        }

        if (criteria.avgScore) {
            return Math.min(100, (stats.avg_score / criteria.avgScore) * 100);
        }

        if (criteria.streak) {
            return Math.min(100, (stats.current_streak / criteria.streak) * 100);
        }

        return 0;
    }
}

module.exports = new AchievementService();
