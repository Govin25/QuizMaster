const { QuestionAttempt, Question, User, Quiz, sequelize } = require('../models/sequelize');

class QuestionAttemptRepository {
    /**
     * Create a question attempt
     * @param {Object} attemptData 
     * @returns {Promise<Object>}
     */
    async create({ userId, quizId, questionId, resultId, userAnswer, isCorrect, timeTakenSeconds }) {
        return await QuestionAttempt.create({
            user_id: userId,
            quiz_id: quizId,
            question_id: questionId,
            result_id: resultId,
            user_answer: userAnswer,
            is_correct: isCorrect,
            time_taken_seconds: timeTakenSeconds,
        });
    }

    /**
     * Create multiple question attempts
     * @param {Array} attempts 
     * @returns {Promise<Array>}
     */
    async bulkCreate(attempts) {
        const formattedAttempts = attempts.map(a => ({
            user_id: a.userId,
            quiz_id: a.quizId,
            question_id: a.questionId,
            result_id: a.resultId,
            user_answer: a.userAnswer,
            is_correct: a.isCorrect,
            time_taken_seconds: a.timeTakenSeconds,
        }));

        return await QuestionAttempt.bulkCreate(formattedAttempts);
    }

    /**
     * Get all attempts for a result
     * @param {number} resultId 
     * @returns {Promise<Array>}
     */
    async findByResult(resultId) {
        return await QuestionAttempt.findAll({
            where: { result_id: resultId },
            include: [
                {
                    model: Question,
                    as: 'question',
                }
            ],
        });
    }

    /**
     * Get question analysis
     * @param {number} questionId 
     * @param {number|null} userId 
     * @returns {Promise<Object|null>}
     */
    async getQuestionAnalysis(questionId, userId = null) {
        const question = await Question.findByPk(questionId, {
            include: [
                {
                    model: Quiz,
                    as: 'quiz',
                }
            ]
        });

        if (!question) return null;

        // Get all attempts for this question
        const whereClause = { question_id: questionId };
        if (userId) {
            whereClause.user_id = userId;
        }

        const attempts = await QuestionAttempt.findAll({
            where: whereClause,
            order: [['attempted_at', 'DESC']],
        });

        const totalAttempts = attempts.length;
        const correctAttempts = attempts.filter(a => a.is_correct).length;
        const avgTime = totalAttempts > 0
            ? attempts.reduce((sum, a) => sum + a.time_taken_seconds, 0) / totalAttempts
            : 0;

        // Get user-specific performance if userId is provided
        let userPerformance = null;
        if (userId) {
            const userAttempts = attempts.filter(a => a.user_id === userId);
            if (userAttempts.length > 0) {
                userPerformance = userAttempts.map(attempt => ({
                    user_answer: attempt.user_answer,
                    is_correct: attempt.is_correct,
                    time_taken_seconds: attempt.time_taken_seconds,
                    attempted_at: attempt.attempted_at,
                }));
            }
        }

        return {
            question: {
                id: question.id,
                question_text: question.question_text,
                type: question.type,
                options: question.options,
                correct_answer: question.correct_answer,
            },
            quiz: {
                id: question.quiz.id,
                title: question.quiz.title,
            },
            userPerformance: userPerformance,
            stats: {
                totalAttempts,
                correctAttempts,
                incorrectAttempts: totalAttempts - correctAttempts,
                successRate: totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0,
                avgTimeSeconds: Math.round(avgTime),
            },
        };
    }
}

module.exports = new QuestionAttemptRepository();
