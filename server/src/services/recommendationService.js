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
            // Step 1: Gather user interaction data with enhanced details
            const userInteractions = await this.getUserInteractions(userId);

            // Step 2: Calculate category, difficulty preferences with recency weights
            const preferences = await this.calculateCategoryScores(userInteractions);

            // Step 3: Get quizzes from followed creators
            const followedCreatorIds = await this.getFollowedCreators(userId);

            // Step 4: Get quiz IDs to exclude (already completed or in library)
            const excludeQuizIds = await this.getExcludedQuizIds(userId);

            // Step 5: Fetch and score quizzes with enhanced algorithm
            const recommendations = await this.fetchRecommendations(
                preferences,
                followedCreatorIds,
                excludeQuizIds,
                limit
            );

            logger.debug('Generated recommendations', {
                userId,
                recommendationCount: recommendations.length,
                categoryPreferences: Object.keys(preferences.categoryScores),
                difficultyPreferences: Object.keys(preferences.difficultyScores || {}),
                followedCreatorCount: followedCreatorIds.length
            });

            return recommendations;
        } catch (error) {
            logger.error('Error generating recommendations', { error, userId });
            throw error;
        }
    }

    /**
     * Get all user interaction data with enhanced details for better recommendations
     */
    static async getUserInteractions(userId) {
        const [completedQuizzes, likedQuizzes, libraryQuizzes] = await Promise.all([
            // Get completed quizzes with categories, scores, and completion time
            Result.findAll({
                where: { user_id: userId },
                attributes: ['quiz_id', 'score', 'completed_at'],
                include: [{
                    model: Quiz,
                    as: 'quiz',
                    attributes: ['id', 'category', 'difficulty'],
                    where: { is_public: true }
                }],
                order: [['completed_at', 'DESC']],
                raw: true
            }),

            // Get liked quizzes with categories and like time
            QuizLike.findAll({
                where: { user_id: userId },
                attributes: ['quiz_id', 'created_at'],
                include: [{
                    model: Quiz,
                    as: 'quiz',
                    attributes: ['id', 'category', 'difficulty'],
                    where: { is_public: true }
                }],
                order: [['created_at', 'DESC']],
                raw: true
            }),

            // Get library quizzes with categories and add time
            UserQuizLibrary.findAll({
                where: { user_id: userId },
                attributes: ['quiz_id', 'added_at'],
                include: [{
                    model: Quiz,
                    as: 'quiz',
                    attributes: ['id', 'category', 'difficulty'],
                    where: { is_public: true }
                }],
                order: [['added_at', 'DESC']],
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
     * Calculate recency weight - more recent interactions have higher weight
     * @param {Date} interactionDate - When the interaction happened
     * @returns {number} - Weight multiplier between 0.5 and 1.0
     */
    static getRecencyWeight(interactionDate) {
        if (!interactionDate) return 0.5;
        const daysSince = (Date.now() - new Date(interactionDate).getTime()) / (1000 * 60 * 60 * 24);

        // Recent (< 7 days): 1.0, < 30 days: 0.8, < 90 days: 0.6, older: 0.5
        if (daysSince < 7) return 1.0;
        if (daysSince < 30) return 0.8;
        if (daysSince < 90) return 0.6;
        return 0.5;
    }

    /**
     * Calculate category and difficulty scores based on user interactions
     * Uses recency weighting and performance signals for smarter recommendations
     */
    static async calculateCategoryScores(interactions) {
        const categoryScores = {};
        const difficultyScores = {};
        const categoryPerformance = {}; // Track user's performance per category

        // Weight completed quizzes (highest signal - user invested time)
        // Base weight: 0.5, modified by recency and score
        interactions.completed.forEach(item => {
            const category = item['quiz.category'];
            const difficulty = item['quiz.difficulty'];
            const score = item.score || 0;
            const recencyWeight = this.getRecencyWeight(item.completed_at);

            if (category) {
                // Higher score = user liked this category more
                const scoreBonus = score >= 80 ? 0.2 : (score >= 60 ? 0.1 : 0);
                categoryScores[category] = (categoryScores[category] || 0) + (0.5 + scoreBonus) * recencyWeight;

                // Track performance for difficulty matching
                if (!categoryPerformance[category]) {
                    categoryPerformance[category] = { totalScore: 0, count: 0 };
                }
                categoryPerformance[category].totalScore += score;
                categoryPerformance[category].count += 1;
            }

            if (difficulty) {
                // If user scores well, they might want similar or harder difficulty
                const diffWeight = score >= 70 ? 0.4 : 0.2;
                difficultyScores[difficulty] = (difficultyScores[difficulty] || 0) + diffWeight * recencyWeight;
            }
        });

        // Weight liked quizzes (strong positive signal - explicit interest)
        // Base weight: 0.4, modified by recency
        interactions.liked.forEach(item => {
            const category = item['quiz.category'];
            const difficulty = item['quiz.difficulty'];
            const recencyWeight = this.getRecencyWeight(item.created_at);

            if (category) {
                categoryScores[category] = (categoryScores[category] || 0) + 0.4 * recencyWeight;
            }
            if (difficulty) {
                difficultyScores[difficulty] = (difficultyScores[difficulty] || 0) + 0.3 * recencyWeight;
            }
        });

        // Weight library quizzes (moderate signal - intent to play)
        // Base weight: 0.25, modified by recency
        interactions.library.forEach(item => {
            const category = item['quiz.category'];
            const difficulty = item['quiz.difficulty'];
            const recencyWeight = this.getRecencyWeight(item.added_at);

            if (category) {
                categoryScores[category] = (categoryScores[category] || 0) + 0.25 * recencyWeight;
            }
            if (difficulty) {
                difficultyScores[difficulty] = (difficultyScores[difficulty] || 0) + 0.15 * recencyWeight;
            }
        });

        // Calculate average performance per category to suggest appropriate difficulty
        const avgPerformance = {};
        Object.entries(categoryPerformance).forEach(([cat, perf]) => {
            avgPerformance[cat] = perf.count > 0 ? perf.totalScore / perf.count : 50;
        });

        return { categoryScores, difficultyScores, avgPerformance };
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
     * Fetch and score quizzes based on enhanced preferences
     * @param {Object} preferences - Contains categoryScores, difficultyScores, avgPerformance
     * @param {Array} followedCreatorIds - IDs of creators user follows
     * @param {Array} excludeQuizIds - Quiz IDs to exclude
     * @param {number} limit - Max recommendations to return
     */
    static async fetchRecommendations(preferences, followedCreatorIds, excludeQuizIds, limit) {
        const { categoryScores, difficultyScores, avgPerformance } = preferences;
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
            limit: limit * 5, // Fetch more to allow for diverse scoring
            order: [['created_at', 'DESC']]
        });

        // Get max likes for normalization
        const maxLikes = Math.max(...quizzes.map(q => parseInt(q.get('likesCount')) || 0), 1);

        // Score each quiz with enhanced algorithm
        const scoredQuizzes = quizzes.map(quiz => {
            let score = 0;
            const quizData = quiz.toJSON();
            const likesCount = parseInt(quizData.likesCount) || 0;

            // 1. Category match score (40% weight, normalized)
            if (categoryScores[quiz.category]) {
                // Normalize category score to max 0.4
                const maxCatScore = Math.max(...Object.values(categoryScores));
                const normalizedCatScore = (categoryScores[quiz.category] / maxCatScore) * 0.4;
                score += normalizedCatScore;
            }

            // 2. Difficulty preference score (15% weight)
            if (difficultyScores && difficultyScores[quiz.difficulty]) {
                const maxDiffScore = Math.max(...Object.values(difficultyScores), 1);
                const normalizedDiffScore = (difficultyScores[quiz.difficulty] / maxDiffScore) * 0.15;
                score += normalizedDiffScore;
            }

            // 3. Difficulty appropriateness based on performance (10% weight)
            // If user scores well in a category, suggest same or harder difficulty
            if (avgPerformance && avgPerformance[quiz.category]) {
                const avgScore = avgPerformance[quiz.category];
                const difficulty = quiz.difficulty?.toLowerCase();

                if (avgScore >= 80) {
                    // User is good - prefer medium/hard
                    if (difficulty === 'hard') score += 0.1;
                    else if (difficulty === 'medium') score += 0.07;
                } else if (avgScore >= 60) {
                    // User is average - prefer easy/medium
                    if (difficulty === 'medium') score += 0.1;
                    else if (difficulty === 'easy') score += 0.07;
                } else {
                    // User struggles - prefer easy
                    if (difficulty === 'easy') score += 0.1;
                    else if (difficulty === 'medium') score += 0.05;
                }
            }

            // 4. Followed creator bonus (15% weight)
            if (followedCreatorIds.includes(quiz.creator_id)) {
                score += 0.15;
            }

            // 5. Popularity score based on likes (10% weight)
            if (likesCount > 0) {
                const normalizedPopularity = (likesCount / maxLikes) * 0.1;
                score += normalizedPopularity;
            }

            // 6. Recency bonus for fresh content (5% weight)
            const daysSinceCreation = (Date.now() - new Date(quiz.created_at).getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceCreation < 7) {
                score += 0.05;
            } else if (daysSinceCreation < 30) {
                score += 0.02;
            }

            // 7. Quality indicator - quizzes with more questions are more substantial (5% weight)
            const questionCount = parseInt(quizData.questionCount) || 0;
            if (questionCount >= 10) {
                score += 0.05;
            } else if (questionCount >= 5) {
                score += 0.03;
            }

            return {
                ...quizData,
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
