const ResultRepository = require('../repositories/ResultRepository');
const QuestionAttemptRepository = require('../repositories/QuestionAttemptRepository');

class QuizResult {
    /**
     * Save a question attempt with detailed metrics
     */
    static async saveQuestionAttempt(attemptData) {
        const attempt = await QuestionAttemptRepository.create(attemptData);
        return attempt.id;
    }

    /**
     * Get comprehensive quiz report with all question attempts
     */
    static async getQuizReport(resultId) {
        return await ResultRepository.getQuizReport(resultId);
    }

    /**
     * Get analysis data for a specific question
     */
    static async getQuestionAnalysis(questionId, userId = null) {
        const analysis = await QuestionAttemptRepository.getQuestionAnalysis(questionId, userId);

        if (!analysis) return null;

        // Add placeholder insights for backward compatibility
        return {
            question: analysis.question,
            userPerformance: null, // Could be enhanced later
            statistics: {
                totalAttempts: analysis.stats.totalAttempts,
                correctAttempts: analysis.stats.correctAttempts,
                successRate: analysis.stats.successRate.toFixed(1),
                averageTime: analysis.stats.avgTimeSeconds,
            },
            insights: {
                explanation: "Detailed explanation will be available soon.",
                commonMistakes: [],
                relatedTopics: [],
                difficulty: "medium"
            }
        };
    }

    /**
     * Get all attempts for a specific quiz by a user
     */
    static async getUserQuizAttempts(quizId, userId) {
        const attempts = await ResultRepository.getUserQuizAttempts(quizId, userId);

        // Format for backward compatibility
        return attempts.map(attempt => ({
            id: attempt.id,
            quiz_id: quizId,
            user_id: userId,
            score: attempt.score,
            completed_at: attempt.completedAt,
            quiz_title: attempt.quizTitle,
            total_questions: attempt.maxScore / 10,
            correct_answers: attempt.score / 10,
            accuracy: attempt.percentage,
        }));
    }
}

module.exports = QuizResult;

