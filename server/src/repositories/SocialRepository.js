const { UserFollow, QuizLike, UserSocialStats, User, Quiz, sequelize } = require('../models/sequelize');
const { Op } = require('sequelize');

class SocialRepository {
    /**
     * Follow a user
     * @param {number} followerId 
     * @param {number} followingId 
     * @returns {Promise<Object>}
     */
    async followUser(followerId, followingId) {
        // Prevent self-follow
        if (followerId === followingId) {
            throw new Error('Cannot follow yourself');
        }

        // Check if already following
        const existing = await UserFollow.findOne({
            where: { follower_id: followerId, following_id: followingId }
        });

        if (existing) {
            throw new Error('Already following this user');
        }

        return await UserFollow.create({
            follower_id: followerId,
            following_id: followingId,
        });
    }

    /**
     * Unfollow a user
     * @param {number} followerId 
     * @param {number} followingId 
     * @returns {Promise<boolean>}
     */
    async unfollowUser(followerId, followingId) {
        const deleted = await UserFollow.destroy({
            where: { follower_id: followerId, following_id: followingId }
        });
        return deleted > 0;
    }

    /**
     * Check if user is following another user
     * @param {number} followerId 
     * @param {number} followingId 
     * @returns {Promise<boolean>}
     */
    async isFollowing(followerId, followingId) {
        if (!followerId || !followingId) return false;

        const follow = await UserFollow.findOne({
            where: { follower_id: followerId, following_id: followingId }
        });
        return !!follow;
    }

    /**
     * Get user's followers
     * @param {number} userId 
     * @param {number} limit 
     * @param {number} offset 
     * @returns {Promise<Array>}
     */
    async getFollowers(userId, limit = 20, offset = 0) {
        const followers = await UserFollow.findAll({
            where: { following_id: userId },
            include: [{
                model: User,
                as: 'follower',
                attributes: ['id', 'username', 'role', 'level', 'xp', 'avatar_url']
            }],
            limit,
            offset,
            order: [['created_at', 'DESC']]
        });

        return followers.map(f => f.follower);
    }

    /**
     * Get users being followed
     * @param {number} userId 
     * @param {number} limit 
     * @param {number} offset 
     * @returns {Promise<Array>}
     */
    async getFollowing(userId, limit = 20, offset = 0) {
        const following = await UserFollow.findAll({
            where: { follower_id: userId },
            include: [{
                model: User,
                as: 'followingUser',
                attributes: ['id', 'username', 'role', 'level', 'xp', 'avatar_url']
            }],
            limit,
            offset,
            order: [['created_at', 'DESC']]
        });

        return following.map(f => f.followingUser);
    }

    /**
     * Like a quiz
     * @param {number} userId 
     * @param {number} quizId 
     * @returns {Promise<Object>}
     */
    async likeQuiz(userId, quizId) {
        // Check if already liked
        const existing = await QuizLike.findOne({
            where: { user_id: userId, quiz_id: quizId }
        });

        if (existing) {
            // Already liked - return existing record (idempotent operation)
            return existing;
        }

        return await QuizLike.create({
            user_id: userId,
            quiz_id: quizId,
        });
    }

    /**
     * Unlike a quiz
     * @param {number} userId 
     * @param {number} quizId 
     * @returns {Promise<boolean>}
     */
    async unlikeQuiz(userId, quizId) {
        const deleted = await QuizLike.destroy({
            where: { user_id: userId, quiz_id: quizId }
        });
        return deleted > 0;
    }

    /**
     * Check if user has liked a quiz
     * @param {number} userId 
     * @param {number} quizId 
     * @returns {Promise<boolean>}
     */
    async hasLiked(userId, quizId) {
        if (!userId || !quizId) return false;

        const like = await QuizLike.findOne({
            where: { user_id: userId, quiz_id: quizId }
        });
        return !!like;
    }

    /**
     * Get quiz likes count and recent likers
     * @param {number} quizId 
     * @param {number} limit 
     * @returns {Promise<Object>}
     */
    async getQuizLikes(quizId, limit = 5) {
        const count = await QuizLike.count({
            where: { quiz_id: quizId }
        });

        const recentLikes = await QuizLike.findAll({
            where: { quiz_id: quizId },
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'username', 'avatar_url']
            }],
            limit,
            order: [['created_at', 'DESC']]
        });

        return {
            count,
            recentLikers: recentLikes.map(l => l.user)
        };
    }

    /**
     * Get trending quizzes (most liked)
     * @param {number} limit 
     * @param {number} days - Look at likes from last N days
     * @returns {Promise<Array>}
     */
    async getTrendingQuizzes(limit = 10, days = 30) {
        const dateThreshold = new Date();
        dateThreshold.setDate(dateThreshold.getDate() - days);

        const quizzes = await Quiz.findAll({
            where: { is_public: true, status: 'approved' },
            attributes: {
                include: [
                    [
                        sequelize.literal(`(
                            SELECT COUNT(*) 
                            FROM quiz_likes 
                            WHERE quiz_likes.quiz_id = Quiz.id
                            AND quiz_likes.created_at >= '${dateThreshold.toISOString()}'
                        )`),
                        'likesCount'
                    ],
                    [
                        sequelize.literal('(SELECT COUNT(*) FROM questions WHERE questions.quiz_id = Quiz.id)'),
                        'questionCount'
                    ]
                ]
            },
            include: [{
                model: User,
                as: 'creator',
                attributes: ['id', 'username', 'avatar_url']
            }],
            order: [[sequelize.literal('likesCount'), 'DESC']],
            limit: limit * 2 // Fetch more to filter
        });

        // Filter quizzes with at least 1 like and return only the requested limit
        return quizzes
            .filter(quiz => parseInt(quiz.dataValues.likesCount) > 0)
            .slice(0, limit);
    }

    /**
     * Get top creators (users with most quizzes)
     * @param {number} limit 
     * @returns {Promise<Array>}
     */
    async getTopCreators(limit = 10) {
        const creators = await User.findAll({
            attributes: {
                exclude: ['password'], // Security: Never expose password
                include: [
                    [
                        sequelize.literal(`(
                            SELECT COUNT(*) 
                            FROM quizzes 
                            WHERE quizzes.creator_id = User.id 
                            AND quizzes.is_public = 1 
                            AND quizzes.status = 'approved'
                        )`),
                        'quizzesCount'
                    ],
                    [
                        sequelize.literal(`(
                            SELECT COUNT(*) 
                            FROM user_follows 
                            WHERE user_follows.following_id = User.id
                        )`),
                        'followersCount'
                    ],
                    [
                        sequelize.literal(`(
                            SELECT COUNT(*) 
                            FROM quiz_likes 
                            JOIN quizzes ON quiz_likes.quiz_id = quizzes.id 
                            WHERE quizzes.creator_id = User.id
                        )`),
                        'totalLikes'
                    ]
                ]
            },
            order: [
                [sequelize.literal('quizzesCount'), 'DESC'],
                [sequelize.literal('followersCount'), 'DESC'] // Tiebreaker
            ],
            limit: limit * 2 // Fetch more to filter
        });

        // Filter creators with at least 1 quiz and return only the requested limit
        return creators
            .filter(creator => parseInt(creator.dataValues.quizzesCount) > 0)
            .slice(0, limit);
    }

    /**
     * Update user's social stats
     * @param {number} userId 
     * @returns {Promise<Object>}
     */
    async updateSocialStats(userId) {
        const [followersCount, followingCount, quizzesCount, totalLikes] = await Promise.all([
            UserFollow.count({ where: { following_id: userId } }),
            UserFollow.count({ where: { follower_id: userId } }),
            Quiz.count({ where: { creator_id: userId, is_public: true, status: 'approved' } }),
            QuizLike.count({
                include: [{
                    model: Quiz,
                    as: 'quiz',
                    where: { creator_id: userId },
                    attributes: []
                }]
            })
        ]);

        const [stats] = await UserSocialStats.findOrCreate({
            where: { user_id: userId },
            defaults: {
                user_id: userId,
                followers_count: followersCount,
                following_count: followingCount,
                quizzes_created_count: quizzesCount,
                total_likes_received: totalLikes
            }
        });

        await stats.update({
            followers_count: followersCount,
            following_count: followingCount,
            quizzes_created_count: quizzesCount,
            total_likes_received: totalLikes,
            updated_at: new Date()
        });

        return stats;
    }

    /**
     * Get user's social stats
     * @param {number} userId 
     * @returns {Promise<Object>}
     */
    async getUserSocialStats(userId) {
        let stats = await UserSocialStats.findOne({
            where: { user_id: userId }
        });

        // If stats don't exist, create them
        if (!stats) {
            stats = await this.updateSocialStats(userId);
        }

        return stats;
    }
}

module.exports = new SocialRepository();
