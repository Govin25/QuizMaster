const { User, Quiz, Result, QuestionAttempt, UserStats, UserAchievement } = require('../models/sequelize');
const logger = require('../utils/logger');

/**
 * Service to export all user data for GDPR compliance
 */
class DataExportService {
    /**
     * Compile all user data into a comprehensive JSON export
     * @param {number} userId - ID of the user requesting data export
     * @returns {Promise<Object>} Complete user data package
     */
    async exportUserData(userId) {
        try {
            // Fetch user profile
            const user = await User.findByPk(userId, {
                attributes: { exclude: ['password'] } // Never export password hash
            });

            if (!user) {
                throw new Error('User not found');
            }

            // Fetch all quizzes created by user
            const createdQuizzes = await Quiz.findAll({
                where: { creator_id: userId },
                include: [{
                    model: require('../models/sequelize').Question,
                    as: 'questions'
                }]
            });

            // Fetch all quiz results
            const quizResults = await Result.findAll({
                where: { user_id: userId },
                include: [{
                    model: Quiz,
                    as: 'quiz',
                    attributes: ['id', 'title', 'category']
                }],
                order: [['completed_at', 'DESC']]
            });

            // Get question attempts
            const questionAttempts = await QuestionAttempt.findAll({
                where: { user_id: userId },
                order: [['attempted_at', 'DESC']]
            });

            // Fetch user statistics
            const userStats = await UserStats.findOne({
                where: { user_id: userId }
            });

            // Fetch user achievements
            const achievements = await UserAchievement.findAll({
                where: { user_id: userId }
            });

            // Compile comprehensive data export
            const dataExport = {
                exportMetadata: {
                    exportDate: new Date().toISOString(),
                    userId: userId,
                    dataVersion: '1.0'
                },
                profile: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    level: user.level,
                    xp: user.xp,
                    avatar_url: user.avatar_url,
                    created_at: user.created_at,
                    terms_accepted_at: user.terms_accepted_at,
                    privacy_accepted_at: user.privacy_accepted_at
                },
                statistics: userStats ? {
                    total_quizzes_taken: userStats.total_quizzes_taken,
                    total_quizzes_created: userStats.total_quizzes_created,
                    average_score: userStats.average_score,
                    best_score: userStats.best_score,
                    total_time_spent: userStats.total_time_spent,
                    current_streak: userStats.current_streak,
                    longest_streak: userStats.longest_streak
                } : null,
                createdQuizzes: createdQuizzes.map(quiz => ({
                    id: quiz.id,
                    title: quiz.title,
                    description: quiz.description,
                    category: quiz.category,
                    difficulty: quiz.difficulty,
                    is_public: quiz.is_public,
                    created_at: quiz.created_at,
                    questionCount: quiz.questions ? quiz.questions.length : 0
                })),
                quizResults: quizResults.map(result => ({
                    id: result.id,
                    quiz_id: result.quiz_id,
                    quiz_title: result.quiz?.title,
                    quiz_category: result.quiz?.category,
                    score: result.score,
                    total_questions: result.total_questions,
                    time_taken: result.time_taken,
                    completed_at: result.completed_at
                })),
                questionAttempts: questionAttempts.map(attempt => ({
                    id: attempt.id,
                    result_id: attempt.result_id,
                    question_id: attempt.question_id,
                    selected_answer: attempt.selected_answer,
                    is_correct: attempt.is_correct,
                    time_taken: attempt.time_taken,
                    attempted_at: attempt.attempted_at
                })),
                achievements: achievements.map(achievement => ({
                    id: achievement.id,
                    achievement_type: achievement.achievement_type,
                    achievement_name: achievement.achievement_name,
                    earned_at: achievement.earned_at
                })),
                summary: {
                    totalQuizzesCreated: createdQuizzes.length,
                    totalQuizzesTaken: quizResults.length,
                    totalQuestionAttempts: questionAttempts.length,
                    totalAchievements: achievements.length
                }
            };

            return dataExport;
        } catch (error) {
            logger.error('Failed to export user data', {
                error,
                context: { userId }
            });
            throw new Error('Failed to export user data');
        }
    }
}

module.exports = new DataExportService();
