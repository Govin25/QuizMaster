const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const commentService = require('../services/CommentService');
const logger = require('../utils/logger');
const { handleError } = require('../utils/errorHandler');

/**
 * GET /api/comments/pending
 * Get flagged comments for moderation (admin only)
 * NOTE: This must be before /quiz/:quizId to avoid matching "pending" as quizId
 */
router.get('/pending', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { limit = 50, offset = 0 } = req.query;

        const result = await commentService.getFlaggedComments({
            limit: parseInt(limit),
            offset: parseInt(offset),
        });

        res.json(result);
    } catch (err) {
        logger.error('Error fetching flagged comments', {
            error: err,
            userId: req.user?.id,
            requestId: req.requestId,
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

/**
 * GET /api/comments/quiz/:quizId
 * Get comments for a quiz (requires quiz completion)
 */
router.get('/quiz/:quizId', authenticateToken, async (req, res) => {
    try {
        const quizId = parseInt(req.params.quizId);
        const userId = req.user.id;
        const { limit = 20, offset = 0, sortBy = 'newest' } = req.query;

        logger.info('Fetching comments', { quizId, userId, limit, offset, sortBy });

        const result = await commentService.getComments(quizId, userId, {
            limit: parseInt(limit),
            offset: parseInt(offset),
            sortBy,
        });

        logger.info('Comments fetch result', { quizId, userId, canView: result.canView, commentCount: result.comments?.length });

        res.json(result);
    } catch (err) {
        logger.error('Error fetching comments', {
            error: err,
            quizId: req.params.quizId,
            userId: req.user?.id,
            requestId: req.requestId,
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

/**
 * GET /api/comments/quiz/:quizId/rating
 * Get rating summary for a quiz
 */
router.get('/quiz/:quizId/rating', authenticateToken, async (req, res) => {
    try {
        const quizId = parseInt(req.params.quizId);
        const userId = req.user.id;

        const result = await commentService.getRatingSummary(quizId, userId);

        res.json(result);
    } catch (err) {
        logger.error('Error fetching rating summary', {
            error: err,
            quizId: req.params.quizId,
            requestId: req.requestId,
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

/**
 * POST /api/comments/quiz/:quizId
 * Add a new comment to a quiz
 */
router.post('/quiz/:quizId', authenticateToken, async (req, res) => {
    try {
        const quizId = parseInt(req.params.quizId);
        const userId = req.user.id;
        const { content, rating, parentId } = req.body;

        const comment = await commentService.createComment(
            quizId,
            userId,
            content,
            rating ? parseInt(rating) : null,
            parentId ? parseInt(parentId) : null
        );

        logger.info('Comment created', {
            quizId,
            userId,
            commentId: comment.id,
            requestId: req.requestId,
        });

        res.status(201).json(comment);
    } catch (err) {
        logger.error('Error creating comment', {
            error: err,
            quizId: req.params.quizId,
            userId: req.user?.id,
            requestId: req.requestId,
        });

        if (err.message.includes('must complete') ||
            err.message.includes('already rated') ||
            err.message.includes('can only post')) {
            return res.status(400).json({ error: err.message });
        }

        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

/**
 * PUT /api/comments/:commentId
 * Edit a comment
 */
router.put('/:commentId', authenticateToken, async (req, res) => {
    try {
        const commentId = parseInt(req.params.commentId);
        const userId = req.user.id;
        const { content } = req.body;

        const comment = await commentService.updateComment(commentId, userId, content);

        res.json(comment);
    } catch (err) {
        logger.error('Error updating comment', {
            error: err,
            commentId: req.params.commentId,
            userId: req.user?.id,
            requestId: req.requestId,
        });

        if (err.message.includes('not found') || err.message.includes('Not authorized')) {
            return res.status(err.message.includes('not found') ? 404 : 403).json({ error: err.message });
        }

        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

/**
 * DELETE /api/comments/:commentId
 * Delete a comment
 */
router.delete('/:commentId', authenticateToken, async (req, res) => {
    try {
        const commentId = parseInt(req.params.commentId);
        const userId = req.user.id;
        const isAdmin = req.user.role === 'admin';

        await commentService.deleteComment(commentId, userId, isAdmin);

        res.json({ message: 'Comment deleted successfully' });
    } catch (err) {
        logger.error('Error deleting comment', {
            error: err,
            commentId: req.params.commentId,
            userId: req.user?.id,
            requestId: req.requestId,
        });

        if (err.message.includes('not found') || err.message.includes('Not authorized')) {
            return res.status(err.message.includes('not found') ? 404 : 403).json({ error: err.message });
        }

        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

/**
 * POST /api/comments/:commentId/upvote
 * Toggle upvote on a comment
 */
router.post('/:commentId/upvote', authenticateToken, async (req, res) => {
    try {
        const commentId = parseInt(req.params.commentId);
        const userId = req.user.id;

        const result = await commentService.toggleUpvote(commentId, userId);

        res.json(result);
    } catch (err) {
        logger.error('Error toggling upvote', {
            error: err,
            commentId: req.params.commentId,
            userId: req.user?.id,
            requestId: req.requestId,
        });

        if (err.message.includes('not found')) {
            return res.status(404).json({ error: err.message });
        }

        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

/**
 * POST /api/comments/:commentId/pin
 * Pin/unpin a comment (quiz creator only)
 */
router.post('/:commentId/pin', authenticateToken, async (req, res) => {
    try {
        const commentId = parseInt(req.params.commentId);
        const userId = req.user.id;

        const result = await commentService.togglePinComment(commentId, userId);

        res.json(result);
    } catch (err) {
        logger.error('Error toggling pin', {
            error: err,
            commentId: req.params.commentId,
            userId: req.user?.id,
            requestId: req.requestId,
        });

        if (err.message.includes('not found')) {
            return res.status(404).json({ error: err.message });
        }
        if (err.message.includes('Only the quiz creator')) {
            return res.status(403).json({ error: err.message });
        }

        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

/**
 * POST /api/comments/:commentId/report
 * Report a comment
 */
router.post('/:commentId/report', authenticateToken, async (req, res) => {
    try {
        const commentId = parseInt(req.params.commentId);
        const userId = req.user.id;
        const { reason } = req.body;

        await commentService.reportComment(commentId, userId, reason);

        res.json({ message: 'Comment reported successfully' });
    } catch (err) {
        logger.error('Error reporting comment', {
            error: err,
            commentId: req.params.commentId,
            userId: req.user?.id,
            requestId: req.requestId,
        });

        if (err.message.includes('not found')) {
            return res.status(404).json({ error: err.message });
        }
        if (err.message.includes('Invalid report reason')) {
            return res.status(400).json({ error: err.message });
        }

        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

/**
 * PUT /api/comments/:commentId/moderate
 * Moderate a comment (admin only)
 */
router.put('/:commentId/moderate', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const commentId = parseInt(req.params.commentId);
        const { action } = req.body;

        const result = await commentService.moderateComment(commentId, action);

        logger.info('Comment moderated', {
            commentId,
            action,
            adminId: req.user.id,
            requestId: req.requestId,
        });

        res.json(result);
    } catch (err) {
        logger.error('Error moderating comment', {
            error: err,
            commentId: req.params.commentId,
            userId: req.user?.id,
            requestId: req.requestId,
        });

        if (err.message.includes('not found')) {
            return res.status(404).json({ error: err.message });
        }
        if (err.message.includes('Invalid moderation action')) {
            return res.status(400).json({ error: err.message });
        }

        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

module.exports = router;
