const { QuizComment, QuizCommentUpvote, User, Quiz, Result } = require('../models/sequelize');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

class CommentRepository {
    /**
     * Check if user has completed the quiz
     */
    async hasUserCompletedQuiz(userId, quizId) {
        // Ensure both are integers for consistent querying
        const parsedUserId = parseInt(userId, 10);
        const parsedQuizId = parseInt(quizId, 10);

        logger.info('hasUserCompletedQuiz query', {
            userId: parsedUserId,
            quizId: parsedQuizId,
            originalUserId: userId,
            originalQuizId: quizId,
            userIdType: typeof userId,
            quizIdType: typeof quizId
        });

        const result = await Result.findOne({
            where: { user_id: parsedUserId, quiz_id: parsedQuizId },
        });

        logger.info('hasUserCompletedQuiz result', {
            userId: parsedUserId,
            quizId: parsedQuizId,
            found: !!result,
            resultId: result?.id
        });

        return !!result;
    }

    /**
     * Get comments for a quiz with pagination
     */
    async getCommentsByQuizId(quizId, options = {}) {
        const {
            limit = 20,
            offset = 0,
            sortBy = 'newest',
            userId = null,
        } = options;

        let order;
        switch (sortBy) {
            case 'top_rated':
                order = [['rating', 'DESC'], ['created_at', 'DESC']];
                break;
            case 'most_upvoted':
                order = [['upvotes', 'DESC'], ['created_at', 'DESC']];
                break;
            case 'oldest':
                order = [['created_at', 'ASC']];
                break;
            case 'newest':
            default:
                order = [['is_pinned', 'DESC'], ['created_at', 'DESC']];
        }

        const comments = await QuizComment.findAll({
            where: {
                quiz_id: quizId,
                parent_id: null, // Top-level comments only
                is_hidden: false,
            },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username'],
                },
                {
                    model: QuizComment,
                    as: 'replies',
                    where: { is_hidden: false },
                    required: false,
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['id', 'username'],
                        },
                    ],
                    order: [['created_at', 'ASC']],
                },
            ],
            order,
            limit,
            offset,
        });

        // If userId provided, check which comments user has upvoted
        let userUpvotes = [];
        if (userId) {
            const upvotes = await QuizCommentUpvote.findAll({
                where: {
                    user_id: userId,
                    comment_id: {
                        [Op.in]: comments.map(c => c.id),
                    },
                },
            });
            userUpvotes = upvotes.map(u => u.comment_id);
        }

        // Get total count
        const total = await QuizComment.count({
            where: {
                quiz_id: quizId,
                parent_id: null,
                is_hidden: false,
            },
        });

        return {
            comments: comments.map(c => ({
                ...c.toJSON(),
                hasUpvoted: userUpvotes.includes(c.id),
            })),
            total,
            hasMore: offset + comments.length < total,
        };
    }

    /**
     * Get rating summary for a quiz
     */
    async getRatingSummary(quizId) {
        const comments = await QuizComment.findAll({
            where: {
                quiz_id: quizId,
                rating: { [Op.ne]: null },
                is_hidden: false,
            },
            attributes: ['rating'],
        });

        if (comments.length === 0) {
            return {
                averageRating: 0,
                totalRatings: 0,
                distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
            };
        }

        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let sum = 0;

        comments.forEach(c => {
            distribution[c.rating]++;
            sum += c.rating;
        });

        return {
            averageRating: Math.round((sum / comments.length) * 10) / 10,
            totalRatings: comments.length,
            distribution,
        };
    }

    /**
     * Create a new comment
     */
    async createComment(data) {
        const { quizId, userId, content, rating, parentId } = data;

        // Check for existing rating from this user on this quiz
        if (rating) {
            const existingRating = await QuizComment.findOne({
                where: {
                    quiz_id: quizId,
                    user_id: userId,
                    rating: { [Op.ne]: null },
                    parent_id: null,
                },
            });

            if (existingRating) {
                throw new Error('You have already rated this quiz');
            }
        }

        const comment = await QuizComment.create({
            quiz_id: quizId,
            user_id: userId,
            content: content.trim(),
            rating: rating || null,
            parent_id: parentId || null,
        });

        // Fetch with user info
        return QuizComment.findByPk(comment.id, {
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username'],
                },
            ],
        });
    }

    /**
     * Update a comment
     */
    async updateComment(commentId, userId, content) {
        const comment = await QuizComment.findByPk(commentId);

        if (!comment) {
            throw new Error('Comment not found');
        }

        if (comment.user_id !== userId) {
            throw new Error('Not authorized to edit this comment');
        }

        comment.content = content.trim();
        comment.updated_at = new Date();
        await comment.save();

        return comment;
    }

    /**
     * Delete a comment
     */
    async deleteComment(commentId, userId, isAdmin = false) {
        const comment = await QuizComment.findByPk(commentId);

        if (!comment) {
            throw new Error('Comment not found');
        }

        if (comment.user_id !== userId && !isAdmin) {
            throw new Error('Not authorized to delete this comment');
        }

        await comment.destroy();
        return true;
    }

    /**
     * Toggle upvote on a comment
     */
    async toggleUpvote(commentId, userId) {
        const existingUpvote = await QuizCommentUpvote.findOne({
            where: { user_id: userId, comment_id: commentId },
        });

        const comment = await QuizComment.findByPk(commentId);
        if (!comment) {
            throw new Error('Comment not found');
        }

        if (existingUpvote) {
            // Remove upvote
            await existingUpvote.destroy();
            comment.upvotes = Math.max(0, comment.upvotes - 1);
            await comment.save();
            return { upvoted: false, upvotes: comment.upvotes };
        } else {
            // Add upvote
            await QuizCommentUpvote.create({
                user_id: userId,
                comment_id: commentId,
            });
            comment.upvotes += 1;
            await comment.save();
            return { upvoted: true, upvotes: comment.upvotes };
        }
    }

    /**
     * Pin/unpin a comment (quiz creator only)
     */
    async togglePinComment(commentId, userId) {
        const comment = await QuizComment.findByPk(commentId, {
            include: [
                {
                    model: Quiz,
                    as: 'quiz',
                    attributes: ['creator_id'],
                },
            ],
        });

        if (!comment) {
            throw new Error('Comment not found');
        }

        if (comment.quiz.creator_id !== userId) {
            throw new Error('Only the quiz creator can pin comments');
        }

        comment.is_pinned = !comment.is_pinned;
        await comment.save();

        return { pinned: comment.is_pinned };
    }

    /**
     * Report a comment
     */
    async reportComment(commentId, userId, reason) {
        const comment = await QuizComment.findByPk(commentId);

        if (!comment) {
            throw new Error('Comment not found');
        }

        comment.is_flagged = true;
        comment.flag_reason = reason;
        await comment.save();

        logger.info('Comment reported', { commentId, userId, reason });
        return true;
    }

    /**
     * Get flagged comments for moderation (admin only)
     */
    async getFlaggedComments(limit = 50, offset = 0) {
        const comments = await QuizComment.findAll({
            where: { is_flagged: true },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username'],
                },
                {
                    model: Quiz,
                    as: 'quiz',
                    attributes: ['id', 'title'],
                },
            ],
            order: [['updated_at', 'DESC']],
            limit,
            offset,
        });

        const total = await QuizComment.count({
            where: { is_flagged: true },
        });

        return { comments, total };
    }

    /**
     * Moderate a comment (admin only)
     */
    async moderateComment(commentId, action) {
        const comment = await QuizComment.findByPk(commentId);

        if (!comment) {
            throw new Error('Comment not found');
        }

        if (action === 'hide') {
            comment.is_hidden = true;
            comment.is_flagged = false;
        } else if (action === 'approve') {
            comment.is_flagged = false;
        } else if (action === 'delete') {
            await comment.destroy();
            return { deleted: true };
        }

        await comment.save();
        return comment;
    }

    /**
     * Get user's comment count on a quiz
     */
    async getUserCommentCount(userId, quizId) {
        return QuizComment.count({
            where: {
                user_id: userId,
                quiz_id: quizId,
            },
        });
    }

    /**
     * Check if user is quiz creator
     */
    async isQuizCreator(userId, quizId) {
        const quiz = await Quiz.findByPk(quizId, {
            attributes: ['creator_id'],
        });
        return quiz && quiz.creator_id === userId;
    }
}

module.exports = new CommentRepository();
