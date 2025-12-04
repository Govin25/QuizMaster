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
            },
            {
                model: User,
                as: 'creator',
                attributes: ['id', 'username']
            }
        ] : [
            {
                model: User,
                as: 'creator',
                attributes: ['id', 'username']
            }
        ];

        return await Quiz.findByPk(id, {
            include,
            attributes: {
                include: [
                    [
                        sequelize.literal('(SELECT COUNT(*) FROM quiz_likes WHERE quiz_likes.quiz_id = Quiz.id)'),
                        'likesCount'
                    ]
                ]
            }
        });
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
        const { User } = require('../models/sequelize');

        return await Quiz.findAll({
            where: { is_public: true },
            attributes: {
                include: [
                    [
                        sequelize.literal('(SELECT COUNT(*) FROM questions WHERE questions.quiz_id = Quiz.id)'),
                        'questionCount'
                    ],
                    [
                        sequelize.literal('(SELECT COUNT(*) FROM quiz_likes WHERE quiz_likes.quiz_id = Quiz.id)'),
                        'likesCount'
                    ]
                ]
            },
            include: [
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'username']
                }
            ],
            order: [['created_at', 'DESC']]
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
     * Get public quizzes created by a user (for profile display)
     * @param {number} userId 
     * @param {number} limit 
     * @param {number} offset 
     * @returns {Promise<Array>}
     */
    async findByCreatorPublic(userId, limit = 10, offset = 0) {
        return await Quiz.findAll({
            where: {
                creator_id: userId,
                is_public: true,
                status: 'approved'
            },
            attributes: {
                include: [
                    [
                        sequelize.literal('(SELECT COUNT(*) FROM questions WHERE questions.quiz_id = Quiz.id)'),
                        'questionCount'
                    ],
                    [
                        sequelize.literal('(SELECT COUNT(*) FROM quiz_likes WHERE quiz_likes.quiz_id = Quiz.id)'),
                        'likesCount'
                    ]
                ]
            },
            order: [['created_at', 'DESC']],
            limit,
            offset
        });
    }

    /**
     * Update quiz status
     * @param {number} id 
     * @param {string} status 
     * @param {boolean} isPublic 
     * @param {number} expectedVersion - Expected version for optimistic locking
     * @returns {Promise<number>}
     */
    async updateStatus(id, status, isPublic, expectedVersion = null) {
        const ConcurrencyError = require('../utils/ConcurrencyError');

        // If version checking is enabled, validate version first
        if (expectedVersion !== null) {
            const currentQuiz = await this.findById(id, false);
            if (!currentQuiz) {
                throw new Error('Quiz not found');
            }

            if (currentQuiz.version !== expectedVersion) {
                throw new ConcurrencyError(
                    `Quiz has been modified by another session. Expected version ${expectedVersion}, but current version is ${currentQuiz.version}.`,
                    'quiz',
                    expectedVersion,
                    currentQuiz.version
                );
            }
        }

        return new Promise((resolve, reject) => {
            const db = require('../db');
            db.run(
                'UPDATE quizzes SET status = ?, is_public = ? WHERE id = ?',
                [status, isPublic ? 1 : 0, id],
                function (err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    /**
     * Delete quiz and all related records
     * @param {number} id 
     * @param {number} expectedVersion - Expected version for optimistic locking
     * @returns {Promise<boolean>}
     */
    async deleteQuiz(id, expectedVersion = null) {
        const ConcurrencyError = require('../utils/ConcurrencyError');

        // If version checking is enabled, validate version first
        if (expectedVersion !== null) {
            const currentQuiz = await this.findById(id, false);
            if (!currentQuiz) {
                throw new Error('Quiz not found');
            }

            if (currentQuiz.version !== expectedVersion) {
                throw new ConcurrencyError(
                    `Quiz has been modified by another session. Expected version ${expectedVersion}, but current version is ${currentQuiz.version}.`,
                    'quiz',
                    expectedVersion,
                    currentQuiz.version
                );
            }
        }

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
     * @param {number} expectedVersion - Expected version for optimistic locking
     * @returns {Promise<Object>}
     */
    async addQuestion(quizId, { type, text, options, correctAnswer }, expectedVersion = null) {
        const ConcurrencyError = require('../utils/ConcurrencyError');

        // If version checking is enabled, validate version first
        if (expectedVersion !== null) {
            const currentQuiz = await this.findById(quizId, false);
            if (!currentQuiz) {
                throw new Error('Quiz not found');
            }

            if (currentQuiz.version !== expectedVersion) {
                throw new ConcurrencyError(
                    `Quiz has been modified by another session. Expected version ${expectedVersion}, but current version is ${currentQuiz.version}.`,
                    'quiz',
                    expectedVersion,
                    currentQuiz.version
                );
            }
        }

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
     * @param {number} expectedVersion - Expected version for optimistic locking
     * @returns {Promise<Array>}
     */
    async updateQuestions(quizId, questions, expectedVersion = null) {
        const ConcurrencyError = require('../utils/ConcurrencyError');

        // If version checking is enabled, validate version first
        if (expectedVersion !== null) {
            const currentQuiz = await this.findById(quizId, false);
            if (!currentQuiz) {
                throw new Error('Quiz not found');
            }

            if (currentQuiz.version !== expectedVersion) {
                throw new ConcurrencyError(
                    `Quiz has been modified by another session. Expected version ${expectedVersion}, but current version is ${currentQuiz.version}.`,
                    'quiz',
                    expectedVersion,
                    currentQuiz.version
                );
            }
        }

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

    /**
     * Search quizzes for challenge creation
     * Returns public approved quizzes + user's own quizzes
     * @param {string} searchQuery - Search term
     * @param {number} userId - Current user ID
     * @param {string} filter - 'all' or 'mine'
     * @returns {Promise<Array>}
     */
    async searchForChallenge(searchQuery, userId, filter = 'all') {
        const searchPattern = `%${searchQuery}%`;

        let whereCondition;

        if (filter === 'mine') {
            // Only user's own quizzes
            whereCondition = {
                creator_id: userId,
                [Op.or]: [
                    { title: { [Op.like]: searchPattern } },
                    { category: { [Op.like]: searchPattern } }
                ]
            };
        } else {
            // Public approved quizzes OR user's own quizzes
            whereCondition = {
                [Op.and]: [
                    {
                        [Op.or]: [
                            { title: { [Op.like]: searchPattern } },
                            { category: { [Op.like]: searchPattern } }
                        ]
                    },
                    {
                        [Op.or]: [
                            {
                                is_public: true,
                                status: 'approved'
                            },
                            { creator_id: userId }
                        ]
                    }
                ]
            };
        }

        return await Quiz.findAll({
            where: whereCondition,
            attributes: {
                include: [
                    [
                        sequelize.literal('(SELECT COUNT(*) FROM questions WHERE questions.quiz_id = Quiz.id)'),
                        'questionCount'
                    ]
                ]
            },
            order: [
                // Prioritize user's own quizzes
                [sequelize.literal(`CASE WHEN creator_id = ${userId} THEN 0 ELSE 1 END`), 'ASC'],
                ['created_at', 'DESC']
            ],
            limit: 50 // Limit results to avoid overwhelming UI
        });
    }
}

module.exports = new QuizRepository();
