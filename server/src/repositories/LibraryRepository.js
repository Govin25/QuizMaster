const { UserQuizLibrary, Quiz, Question, Result, sequelize } = require('../models/sequelize');
const { Op } = require('sequelize');

class LibraryRepository {
    /**
     * Add quiz to user's library
     * @param {number} userId 
     * @param {number} quizId 
     * @returns {Promise<Object>}
     */
    async addToLibrary(userId, quizId) {
        // Check if already in library (idempotent operation)
        const existing = await UserQuizLibrary.findOne({
            where: { user_id: userId, quiz_id: quizId }
        });

        if (existing) {
            // Already in library - return existing entry (idempotent)
            return existing;
        }

        try {
            return await UserQuizLibrary.create({
                user_id: userId,
                quiz_id: quizId,
            });
        } catch (error) {
            // Handle race condition - if created between check and insert
            if (error.name === 'SequelizeUniqueConstraintError') {
                // Fetch and return the existing entry
                const entry = await UserQuizLibrary.findOne({
                    where: { user_id: userId, quiz_id: quizId }
                });
                return entry;
            }
            throw error;
        }
    }

    /**
     * Remove quiz from user's library
     * @param {number} userId 
     * @param {number} quizId 
     * @returns {Promise<boolean>}
     */
    async removeFromLibrary(userId, quizId) {
        const deleted = await UserQuizLibrary.destroy({
            where: { user_id: userId, quiz_id: quizId },
        });
        return deleted > 0;
    }

    /**
     * Remove quiz from all users' libraries (used when quiz is deleted)
     * @param {number} quizId 
     * @returns {Promise<number>} Number of library entries removed
     */
    async removeQuizFromAllLibraries(quizId) {
        const deleted = await UserQuizLibrary.destroy({
            where: { quiz_id: quizId },
        });
        return deleted;
    }

    /**
     * Get user's quiz library with stats
     * @param {number} userId 
     * @returns {Promise<Object>}
     */
    async getUserLibrary(userId) {
        // Get all quizzes in user's library
        const libraryEntries = await UserQuizLibrary.findAll({
            where: { user_id: userId },
            include: [
                {
                    model: Quiz,
                    as: 'quiz',
                }
            ],
            order: [['added_at', 'DESC']],
        });

        // Get quiz IDs
        const quizIds = libraryEntries.map(entry => entry.quiz_id);

        if (quizIds.length === 0) {
            return { recentlyAdded: [], completed: [] };
        }

        // Get question counts for all quizzes
        const questionCounts = await Question.findAll({
            where: { quiz_id: quizIds },
            attributes: [
                'quiz_id',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['quiz_id'],
            raw: true,
        });

        const questionCountMap = {};
        questionCounts.forEach(qc => {
            questionCountMap[qc.quiz_id] = parseInt(qc.count);
        });

        // Get attempt counts and best scores for each quiz
        const attemptStats = await Result.findAll({
            where: {
                user_id: userId,
                quiz_id: quizIds,
            },
            attributes: [
                'quiz_id',
                [sequelize.fn('COUNT', sequelize.col('id')), 'attemptCount'],
                [sequelize.fn('MAX', sequelize.col('score')), 'bestScore'],
                [sequelize.fn('MAX', sequelize.col('completed_at')), 'lastAttemptDate'],
            ],
            group: ['quiz_id'],
            raw: true,
        });

        const attemptStatsMap = {};
        attemptStats.forEach(stat => {
            attemptStatsMap[stat.quiz_id] = {
                attemptCount: parseInt(stat.attemptCount),
                bestScore: stat.bestScore,
                lastAttemptDate: stat.lastAttemptDate,
            };
        });

        // Get best result IDs
        const bestResults = await Result.findAll({
            where: {
                user_id: userId,
                quiz_id: quizIds,
            },
            attributes: [
                'quiz_id',
                'id',
                'score',
                'completed_at',
            ],
            order: [
                ['quiz_id', 'ASC'],
                ['score', 'DESC'],
            ],
            raw: true,
        });

        const bestResultMap = {};
        bestResults.forEach(result => {
            if (!bestResultMap[result.quiz_id]) {
                bestResultMap[result.quiz_id] = result;
            }
        });

        // Format the results
        const formattedQuizzes = libraryEntries.map(entry => {
            const quiz = entry.quiz;
            const stats = attemptStatsMap[quiz.id] || { attemptCount: 0 };
            const bestResult = bestResultMap[quiz.id];
            const questionCount = questionCountMap[quiz.id] || 0;

            return {
                id: quiz.id,
                title: quiz.title,
                category: quiz.category,
                difficulty: quiz.difficulty,
                creator_id: quiz.creator_id,
                is_public: quiz.is_public,
                status: quiz.status,
                created_at: quiz.created_at,
                source: quiz.source,
                added_at: entry.added_at,
                questionCount,
                attemptCount: stats.attemptCount,
                lastAttemptDate: stats.lastAttemptDate,
                result_id: bestResult?.id,
                score: bestResult?.score,
                completed_at: bestResult?.completed_at,
            };
        });

        // Separate into recently added (not completed) and completed
        const recentlyAdded = formattedQuizzes.filter(q => !q.result_id);
        const completed = formattedQuizzes
            .filter(q => q.result_id)
            .sort((a, b) => new Date(b.lastAttemptDate) - new Date(a.lastAttemptDate));

        return { recentlyAdded, completed };
    }
}

module.exports = new LibraryRepository();
