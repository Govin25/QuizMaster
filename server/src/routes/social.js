const express = require('express');
const router = express.Router();
const { authenticateToken, optionalAuthenticateToken } = require('../middleware/authMiddleware');
const socialService = require('../services/socialService');
const SocialRepository = require('../repositories/SocialRepository');
const logger = require('../utils/logger');
const { handleError } = require('../utils/errorHandler');

// Follow a user
router.post('/follow/:userId', authenticateToken, async (req, res) => {
    try {
        const followerId = req.user.id;
        const followingId = parseInt(req.params.userId);

        if (followerId === followingId) {
            return res.status(400).json({ error: 'Cannot follow yourself' });
        }

        await socialService.followUser(followerId, followingId);

        logger.info('User followed', {
            followerId,
            followingId,
            requestId: req.requestId
        });

        res.json({ message: 'User followed successfully' });
    } catch (err) {
        logger.error('Follow user failed', {
            error: err,
            context: { userId: req.params.userId },
            requestId: req.requestId
        });

        if (err.message === 'Already following this user' || err.message === 'User not found') {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

// Unfollow a user
router.delete('/unfollow/:userId', authenticateToken, async (req, res) => {
    try {
        const followerId = req.user.id;
        const followingId = parseInt(req.params.userId);

        const result = await socialService.unfollowUser(followerId, followingId);

        logger.info('User unfollowed', {
            followerId,
            followingId,
            success: result,
            requestId: req.requestId
        });

        res.json({
            message: result ? 'User unfollowed successfully' : 'Not following this user',
            success: result
        });
    } catch (err) {
        logger.error('Unfollow user failed', {
            error: err,
            context: { userId: req.params.userId },
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

// Get user's followers
router.get('/followers/:userId', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;

        const followers = await SocialRepository.getFollowers(userId, limit, offset);
        res.json(followers);
    } catch (err) {
        logger.error('Get followers failed', {
            error: err,
            context: { userId: req.params.userId },
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

// Get users being followed
router.get('/following/:userId', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;

        const following = await SocialRepository.getFollowing(userId, limit, offset);
        res.json(following);
    } catch (err) {
        logger.error('Get following failed', {
            error: err,
            context: { userId: req.params.userId },
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

// Check if following a user
router.get('/is-following/:userId', authenticateToken, async (req, res) => {
    try {
        const followerId = req.user.id;
        const followingId = parseInt(req.params.userId);

        const isFollowing = await SocialRepository.isFollowing(followerId, followingId);
        res.json({ isFollowing });
    } catch (err) {
        logger.error('Check following status failed', {
            error: err,
            context: { userId: req.params.userId },
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

// Like a quiz
router.post('/quizzes/:quizId/like', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const quizId = parseInt(req.params.quizId);

        await socialService.likeQuiz(userId, quizId);

        logger.info('Quiz liked', {
            userId,
            quizId,
            requestId: req.requestId
        });

        res.json({ message: 'Quiz liked successfully' });
    } catch (err) {
        logger.error('Like quiz failed', {
            error: err,
            context: { quizId: req.params.quizId },
            requestId: req.requestId
        });

        if (err.message === 'Already liked this quiz' ||
            err.message === 'Quiz not found' ||
            err.message === 'Can only like public quizzes') {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

// Unlike a quiz
router.delete('/quizzes/:quizId/unlike', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const quizId = parseInt(req.params.quizId);

        const result = await socialService.unlikeQuiz(userId, quizId);

        logger.info('Quiz unliked', {
            userId,
            quizId,
            success: result,
            requestId: req.requestId
        });

        res.json({
            message: result ? 'Quiz unliked successfully' : 'Quiz was not liked',
            success: result
        });
    } catch (err) {
        logger.error('Unlike quiz failed', {
            error: err,
            context: { quizId: req.params.quizId },
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

// Get quiz likes
router.get('/quizzes/:quizId/likes', async (req, res) => {
    try {
        const quizId = parseInt(req.params.quizId);
        const limit = parseInt(req.query.limit) || 5;

        const likes = await SocialRepository.getQuizLikes(quizId, limit);
        res.json(likes);
    } catch (err) {
        logger.error('Get quiz likes failed', {
            error: err,
            context: { quizId: req.params.quizId },
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

// Check if user has liked a quiz
router.get('/quizzes/:quizId/has-liked', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const quizId = parseInt(req.params.quizId);

        const hasLiked = await SocialRepository.hasLiked(userId, quizId);
        res.json({ hasLiked });
    } catch (err) {
        logger.error('Check like status failed', {
            error: err,
            context: { quizId: req.params.quizId },
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

// Get trending quizzes
router.get('/trending', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const days = parseInt(req.query.days) || 30;

        const quizzes = await socialService.getTrendingQuizzes(limit, days);
        res.json(quizzes);
    } catch (err) {
        logger.error('Get trending quizzes failed', {
            error: err,
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

// Get top creators
router.get('/top-creators', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;

        const creators = await socialService.getTopCreators(limit);
        res.json(creators);
    } catch (err) {
        logger.error('Get top creators failed', {
            error: err,
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

// Get user profile with social stats
router.get('/profile/:userId', optionalAuthenticateToken, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const currentUserId = req.user?.id || null;

        const profile = await socialService.getUserProfile(userId, currentUserId);
        res.json(profile);
    } catch (err) {
        logger.error('Get user profile failed', {
            error: err,
            context: { userId: req.params.userId },
            requestId: req.requestId
        });

        if (err.message === 'User not found') {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

// Get user's public quizzes
router.get('/profile/:userId/quizzes', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;

        const quizzes = await socialService.getUserQuizzes(userId, limit, offset);
        res.json(quizzes);
    } catch (err) {
        logger.error('Get user quizzes failed', {
            error: err,
            context: { userId: req.params.userId },
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

module.exports = router;
