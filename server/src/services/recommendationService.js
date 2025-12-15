const { Quiz, Result, QuizLike, UserQuizLibrary, UserFollow } = require('../models/sequelize');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

/**
 * Recommendation Service
 * Provides personalized quiz recommendations based on user interactions
 */
class RecommendationService {
    /**
     * Get personalized quiz recommendations for a user
     * @param {number} userId - User ID
     * @param {number} limit - Maximum number of recommendations to return
     * @returns {Promise<Array>} - Array of recommended quiz objects
     */
    static async getRecommendations(userId, limit = 10) {
        try {
            // Step 1: Gather user interaction data
            const userInteractions = await this.getUserInteractions(userId);

            // Step 2: Calculate category preferences with weights
            const categoryScores = await this.calculateCategoryScores(userInteractions);

            // Step 3: Get quizzes from followed creators
            const followedCreatorIds = await this.getFollowedCreators(userId);

            // Step 4: Get quiz IDs to exclude (already completed or in library)
            const excludeQuizIds = await this.getExcludedQuizIds(userId);

            // Step 5: Fetch and score quizzes
            const recommendations = await this.fetchRecommendations(
                categoryScores,
                followedCreatorIds,
                excludeQuizIds,
                limit
            );

            logger.debug('Generated recommendations', {
                userId,
                recommendationCount: recommendations.length,
                categoryScores,
                followedCreatorCount: followedCreatorIds.length
            });

            return recommendations;
        } catch (error) {
            logger.error('Error generating recommendations', { error, userId });
            throw error;
        }
    }

    /**
     * Get all user interaction data
     */
    static async getUserInteractions(userId) {
        const [completedQuizzes, likedQuizzes, libraryQuizzes] = await Promise.all([
            // Get completed quizzes with categories
            Result.findAll({
                where: { user_id: userId },
                attributes: ['quiz_id'],
                include: [{
                    model: Quiz,
                    as: 'quiz',
                    attributes: ['id', 'category'],
                    where: { is_public: true }
                }],
                raw: true
            }),

            // Get liked quizzes with categories
            QuizLike.findAll({
                where: { user_id: userId },
                attributes: ['quiz_id'],
                include: [{
                    model: Quiz,
                    as: 'quiz',
                    attributes: ['id', 'category'],
                    where: { is_public: true }
                }],
                raw: true
            }),

            // Get library quizzes with categories
            UserQuizLibrary.findAll({
                where: { user_id: userId },
                attributes: ['quiz_id'],
                include: [{
                    model: Quiz,
                    as: 'quiz',
                    attributes: ['id', 'category'],
                    where: { is_public: true }
                }],
                raw: true
            })
        ]);

        return {
            completed: completedQuizzes,
            liked: likedQuizzes,
            library: libraryQuizzes
        };
    }

    /**
     * Calculate category scores based on user interactions
     * Weights: 40% completed, 30% liked, 20% library, 10% followed creators (applied later)
     */
    static async calculateCategoryScores(interactions) {
        const categoryScores = {};

        // Weight completed quizzes (40%)
        interactions.completed.forEach(item => {
            const category = item['quiz.category'];
            if (category) {
                categoryScores[category] = (categoryScores[category] || 0) + 0.4;
            }
        });

        // Weight liked quizzes (30%)
        interactions.liked.forEach(item => {
            const category = item['quiz.category'];
            if (category) {
                categoryScores[category] = (categoryScores[category] || 0) + 0.3;
            }
        });

        // Weight library quizzes (20%)
        interactions.library.forEach(item => {
            const category = item['quiz.category'];
            if (category) {
                categoryScores[category] = (categoryScores[category] || 0) + 0.2;
            }
        });

        return categoryScores;
    }

    /**
     * Get IDs of creators that the user follows
     */
    static async getFollowedCreators(userId) {
        const follows = await UserFollow.findAll({
            where: { follower_id: userId },
            attributes: ['following_id'],
            raw: true
        });

        return follows.map(f => f.following_id);
    }

    /**
     * Get quiz IDs to exclude from recommendations
     */
    static async getExcludedQuizIds(userId) {
        const [completedQuizIds, libraryQuizIds] = await Promise.all([
            Result.findAll({
                where: { user_id: userId },
                attributes: ['quiz_id'],
                raw: true
            }),
            UserQuizLibrary.findAll({
                where: { user_id: userId },
                attributes: ['quiz_id'],
                raw: true
            })
        ]);

        const excludeSet = new Set([
            ...completedQuizIds.map(r => r.quiz_id),
            ...libraryQuizIds.map(l => l.quiz_id)
        ]);

        return Array.from(excludeSet);
    }

    /**
     * Fetch and score quizzes based on category preferences and followed creators
     */
    static async fetchRecommendations(categoryScores, followedCreatorIds, excludeQuizIds, limit) {
        const categories = Object.keys(categoryScores);

        if (categories.length === 0 && followedCreatorIds.length === 0) {
            // No interaction data - return empty array
            return [];
        }

        // Build where clause
        const whereClause = {
            is_public: true,
            status: 'approved'
        };

        if (excludeQuizIds.length > 0) {
            whereClause.id = { [Op.notIn]: excludeQuizIds };
        }

        // Fetch quizzes from preferred categories OR followed creators
        const orConditions = [];

        if (categories.length > 0) {
            orConditions.push({ category: { [Op.in]: categories } });
        }

        if (followedCreatorIds.length > 0) {
            orConditions.push({ creator_id: { [Op.in]: followedCreatorIds } });
        }

        if (orConditions.length > 0) {
            whereClause[Op.or] = orConditions;
        }

        // Fetch quizzes with creator info, question count, and likes count
        const { sequelize } = require('../models/sequelize');
        const quizzes = await Quiz.findAll({
            where: whereClause,
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
                    model: require('../models/sequelize').User,
                    as: 'creator',
                    attributes: ['id', 'username']
                }
            ],
            limit: limit * 3, // Fetch more to allow for scoring
            order: [['created_at', 'DESC']]
        });

        // Score each quiz
        const scoredQuizzes = quizzes.map(quiz => {
            let score = 0;

            // Category match score (up to 90% of total weight)
            if (categoryScores[quiz.category]) {
                score += categoryScores[quiz.category];
            }

            // Followed creator bonus (10% weight)
            if (followedCreatorIds.includes(quiz.creator_id)) {
                score += 0.1;
            }

            // Recency bonus (small boost for newer quizzes)
            const daysSinceCreation = (Date.now() - new Date(quiz.created_at).getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceCreation < 7) {
                score += 0.05;
            }

            return {
                ...quiz.toJSON(),
                recommendationScore: score
            };
        });

        // Sort by score and return top N
        scoredQuizzes.sort((a, b) => b.recommendationScore - a.recommendationScore);

        return scoredQuizzes.slice(0, limit);
    }

    /**
     * Get all unique categories from public quizzes
     */
    static async getAllCategories() {
        const categories = await Quiz.findAll({
            where: {
                is_public: true,
                status: 'approved'
            },
            attributes: ['category'],
            group: ['category'],
            raw: true
        });

        return categories.map(c => c.category).sort();
    }

    /**
     * Get quizzes grouped by category
     */
    static async getQuizzesByCategory(limit = 6, offset = 0) {
        const categories = await this.getAllCategories();

        const quizzesByCategory = {};

        for (const category of categories) {
            const { sequelize } = require('../models/sequelize');
            const quizzes = await Quiz.findAll({
                where: {
                    category: category,
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
                include: [
                    {
                        model: require('../models/sequelize').User,
                        as: 'creator',
                        attributes: ['id', 'username']
                    }
                ],
                limit: limit,
                offset: offset,
                order: [['created_at', 'DESC']]
            });

            if (quizzes.length > 0) {
                quizzesByCategory[category] = quizzes.map(q => q.toJSON());
            }
        }

        return quizzesByCategory;
    }

    /**
     * Get quizzes from a specific category with pagination
     */
    static async getQuizzesBySpecificCategory(category, limit = 10, offset = 0) {
        const { sequelize } = require('../models/sequelize');

        const quizzes = await Quiz.findAll({
            where: {
                category: category,
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
            include: [
                {
                    model: require('../models/sequelize').User,
                    as: 'creator',
                    attributes: ['id', 'username']
                }
            ],
            limit: limit,
            offset: offset,
            order: [['created_at', 'DESC']]
        });

        return quizzes.map(q => q.toJSON());
    }
}

module.exports = RecommendationService;
