const commentRepository = require('../repositories/CommentRepository');
const logger = require('../utils/logger');

const MAX_COMMENTS_PER_QUIZ = 5; // Rate limit
const MAX_COMMENT_LENGTH = 1000;

class CommentService {
    /**
     * Get comments for a quiz (with spoiler protection)
     */
    async getComments(quizId, userId, options = {}) {
        logger.info('CommentService.getComments called', { quizId, userId, quizIdType: typeof quizId, userIdType: typeof userId });

        // Check if user has completed the quiz
        const hasCompleted = await commentRepository.hasUserCompletedQuiz(userId, quizId);

        logger.info('Completion check result', { quizId, userId, hasCompleted });

        if (!hasCompleted) {
            return {
                canView: false,
                message: 'Complete this quiz to view reviews and comments',
                comments: [],
                total: 0,
            };
        }

        const result = await commentRepository.getCommentsByQuizId(quizId, {
            ...options,
            userId,
        });

        // Check if user is quiz creator
        const isCreator = await commentRepository.isQuizCreator(userId, quizId);

        return {
            canView: true,
            isCreator,
            ...result,
        };
    }

    /**
     * Get rating summary for a quiz
     */
    async getRatingSummary(quizId, userId) {
        // Check if user has completed the quiz
        const hasCompleted = await commentRepository.hasUserCompletedQuiz(userId, quizId);

        if (!hasCompleted) {
            return {
                canView: false,
                message: 'Complete this quiz to view ratings',
            };
        }

        return {
            canView: true,
            ...await commentRepository.getRatingSummary(quizId),
        };
    }

    /**
     * Create a new comment
     */
    async createComment(quizId, userId, content, rating = null, parentId = null) {
        // Validate content
        if (!content || content.trim().length === 0) {
            throw new Error('Comment content is required');
        }

        if (content.length > MAX_COMMENT_LENGTH) {
            throw new Error(`Comment must be ${MAX_COMMENT_LENGTH} characters or less`);
        }

        // Validate rating
        if (rating !== null && (rating < 1 || rating > 5)) {
            throw new Error('Rating must be between 1 and 5');
        }

        // Check if user has completed the quiz
        const hasCompleted = await commentRepository.hasUserCompletedQuiz(userId, quizId);

        if (!hasCompleted) {
            throw new Error('You must complete this quiz before commenting');
        }

        // Rate limiting - check user's comment count on this quiz
        const commentCount = await commentRepository.getUserCommentCount(userId, quizId);

        if (commentCount >= MAX_COMMENTS_PER_QUIZ) {
            throw new Error(`You can only post ${MAX_COMMENTS_PER_QUIZ} comments per quiz`);
        }

        const comment = await commentRepository.createComment({
            quizId,
            userId,
            content,
            rating,
            parentId,
        });

        logger.info('Comment created', { quizId, userId, commentId: comment.id });

        return comment;
    }

    /**
     * Update a comment
     */
    async updateComment(commentId, userId, content) {
        if (!content || content.trim().length === 0) {
            throw new Error('Comment content is required');
        }

        if (content.length > MAX_COMMENT_LENGTH) {
            throw new Error(`Comment must be ${MAX_COMMENT_LENGTH} characters or less`);
        }

        const comment = await commentRepository.updateComment(commentId, userId, content);

        logger.info('Comment updated', { commentId, userId });

        return comment;
    }

    /**
     * Delete a comment
     */
    async deleteComment(commentId, userId, isAdmin = false) {
        await commentRepository.deleteComment(commentId, userId, isAdmin);

        logger.info('Comment deleted', { commentId, userId, isAdmin });

        return { success: true };
    }

    /**
     * Toggle upvote on a comment
     */
    async toggleUpvote(commentId, userId) {
        const result = await commentRepository.toggleUpvote(commentId, userId);

        logger.info('Comment upvote toggled', { commentId, userId, upvoted: result.upvoted });

        return result;
    }

    /**
     * Pin/unpin a comment
     */
    async togglePinComment(commentId, userId) {
        const result = await commentRepository.togglePinComment(commentId, userId);

        logger.info('Comment pin toggled', { commentId, userId, pinned: result.pinned });

        return result;
    }

    /**
     * Report a comment
     */
    async reportComment(commentId, userId, reason) {
        const validReasons = ['spoilers', 'inappropriate', 'spam', 'harassment', 'other'];

        if (!validReasons.includes(reason)) {
            throw new Error('Invalid report reason');
        }

        await commentRepository.reportComment(commentId, userId, reason);

        return { success: true };
    }

    /**
     * Get flagged comments (admin only)
     */
    async getFlaggedComments(options = {}) {
        return commentRepository.getFlaggedComments(options.limit, options.offset);
    }

    /**
     * Moderate a comment (admin only)
     */
    async moderateComment(commentId, action) {
        const validActions = ['hide', 'approve', 'delete'];

        if (!validActions.includes(action)) {
            throw new Error('Invalid moderation action');
        }

        const result = await commentRepository.moderateComment(commentId, action);

        logger.info('Comment moderated', { commentId, action });

        return result;
    }
}

module.exports = new CommentService();
