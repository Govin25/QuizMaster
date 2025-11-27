const { Quiz, Question, User, Result, sequelize } = require('../models/sequelize');
const { Op } = require('sequelize');

class QuizRepository {
    /**
     * Create a new quiz
     * @param {Object} quizData 
     * @returns {Promise<Object>}
     */
    async create({ title, category, difficulty, creator_id, source = 'manual' }) {
        return await Quiz.create({
            title,
            category,
            difficulty,
            creator_id,
            source,
        });
    }

    /**
     * Find quiz by ID
     * @param {number} id 
     * @param {boolean} includeQuestions 
     * @returns {Promise<Object|null>}
     */
    async findById(id, includeQuestions = true) {
        const include = includeQuestions ? [
            {
                model: Question,
                as: 'questions',
            }
        ] : [];

        return await Quiz.findByPk(id, { include });
    }

    /**
     * Get all quizzes with question count
     * @returns {Promise<Array>}
     */
    async findAll() {
        return await Quiz.findAll({
            attributes: {
                include: [
                    [
                        sequelize.literal('(SELECT COUNT(*) FROM questions WHERE questions.quiz_id = Quiz.id)'),
                        'questionCount'
                    ]
                ]
            },
        });
    }

    /**
     * Get public quizzes
     * @returns {Promise<Array>}
     */
    async findPublic() {
        return await Quiz.findAll({
            where: { is_public: true },
            attributes: {
                include: [
                    [
                        sequelize.literal('(SELECT COUNT(*) FROM questions WHERE questions.quiz_id = Quiz.id)'),
                        'questionCount'
                    ]
                ]
            },
        });
    }

    /**
     * Get quizzes created by a user
     * @param {number} userId 
     * @returns {Promise<Array>}
     */
    async findByCreator(userId) {
        return await Quiz.findAll({
            where: { creator_id: userId },
            attributes: {
                include: [
                    [
                        sequelize.literal('(SELECT COUNT(*) FROM questions WHERE questions.quiz_id = Quiz.id)'),
                        'questionCount'
                    ]
                ]
            },
        });
    }

    /**
     * Update quiz status
     * @param {number} id 
     * @param {string} status 
     * @param {boolean} isPublic 
     * @returns {Promise<number>}
     */
    async updateStatus(id, status, isPublic) {
        const [affectedRows] = await Quiz.update(
            { status, is_public: isPublic },
            { where: { id } }
        );
        return affectedRows;
    }

    /**
     * Delete quiz and all related records
     * @param {number} id 
     * @returns {Promise<boolean>}
     */
    async deleteQuiz(id) {
        const transaction = await sequelize.transaction();

        try {
            // Import models needed for deletion
            const { QuestionAttempt, QuizReview, UserQuizLibrary } = require('../models/sequelize');

            // Delete in order to respect foreign key constraints:
            // 1. Delete question attempts (references results and questions)
            await QuestionAttempt.destroy({
                where: { quiz_id: id },
                transaction
            });

            // 2. Delete results (references quiz)
            await Result.destroy({
                where: { quiz_id: id },
                transaction
            });

            // 3. Delete quiz reviews (references quiz)
            await QuizReview.destroy({
                where: { quiz_id: id },
                transaction
            });

            // 4. Delete questions (references quiz)
            await Question.destroy({
                where: { quiz_id: id },
                transaction
            });

            // 5. Delete library entries (references quiz)
            await UserQuizLibrary.destroy({
                where: { quiz_id: id },
                transaction
            });

            // 6. Finally, delete the quiz itself
            const deleted = await Quiz.destroy({
                where: { id },
                transaction
            });

            await transaction.commit();
            return deleted > 0;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Add question to quiz
     * @param {number} quizId 
     * @param {Object} questionData 
     * @returns {Promise<Object>}
     */
    async addQuestion(quizId, { type, text, options, correctAnswer }) {
        return await Question.create({
            quiz_id: quizId,
            type,
            question_text: text,
            options, // Will be auto-converted to JSON by model setter
            correct_answer: correctAnswer,
        });
    }

    /**
     * Update all questions for a quiz
     * @param {number} quizId 
     * @param {Array} questions 
     * @returns {Promise<Array>}
     */
    async updateQuestions(quizId, questions) {
        const transaction = await sequelize.transaction();

        try {
            // Delete existing questions
            await Question.destroy({ where: { quiz_id: quizId }, transaction });

            // Add new questions
            const newQuestions = await Promise.all(
                questions.map(q =>
                    Question.create({
                        quiz_id: quizId,
                        type: q.type,
                        question_text: q.text,
                        options: q.options,
                        correct_answer: q.correctAnswer,
                    }, { transaction })
                )
            );

            await transaction.commit();
            return newQuestions;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}

module.exports = new QuizRepository();
