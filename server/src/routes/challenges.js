const express = require('express');
const router = express.Router();
const { authenticateToken, requirePermission } = require('../middleware/authMiddleware');
const ChallengeRepository = require('../repositories/ChallengeRepository');
const ChallengeService = require('../services/challengeService');
const NotificationService = require('../services/notificationService');
const logger = require('../utils/logger');
const { handleError } = require('../utils/errorHandler');

// Create a new challenge
router.post('/create', authenticateToken, requirePermission('challenge:create'), async (req, res) => {
    try {
        const { quizId, opponentUsername } = req.body;
        const creatorId = req.user.id;

        // Validate input
        if (!quizId || !opponentUsername) {
            return res.status(400).json({ error: 'Quiz ID and opponent username are required' });
        }

        // Validate challenge creation
        const { quiz, opponent } = await ChallengeService.validateChallengeCreation(
            quizId,
            creatorId,
            opponentUsername
        );

        // Create challenge
        const challengeId = await ChallengeRepository.createChallenge(
            quizId,
            creatorId,
            opponent.id
        );

        logger.info('Challenge created', {
            challengeId,
            quizId,
            creatorId,
            opponentId: opponent.id,
            requestId: req.requestId
        });

        // Get full challenge details
        const challenge = await ChallengeRepository.getChallengeById(challengeId);

        // Notify opponent via socket that they received a challenge
        // Notify opponent via socket that they received a challenge
        const io = req.app.get('io');

        // Create persistent notification
        await NotificationService.createNotification(
            opponent.id,
            'challenge_invite',
            'New Challenge Request',
            `${req.user.username} challenged you to "${quiz.title}"!`,
            { challengeId, quizId, creatorUsername: req.user.username, quizTitle: quiz.title },
            io
        );

        if (io) {
            io.to(`user_${opponent.id}`).emit('challenge_received', {
                challengeId,
                opponentId: opponent.id,
                creatorUsername: req.user.username,
                quizTitle: quiz.title
            });
        }

        res.status(201).json({
            message: 'Challenge created successfully',
            challenge
        });
    } catch (err) {
        logger.error('Failed to create challenge', {
            error: err,
            context: { userId: req.user.id, body: req.body },
            requestId: req.requestId
        });
        res.status(400).json({ error: err.message });
    }
});

// Get user's challenges
router.get('/my-challenges', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { status, type, limit } = req.query;

        const filters = {};
        if (status) filters.status = status;
        if (type) filters.type = type;
        if (limit) filters.limit = parseInt(limit);

        const challenges = await ChallengeRepository.getUserChallenges(userId, filters);

        res.json({ challenges });
    } catch (err) {
        logger.error('Failed to get user challenges', {
            error: err,
            context: { userId: req.user.id },
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

// Get previous challenge opponents (for suggestions)
router.get('/previous-opponents', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 10;

        const opponents = await ChallengeRepository.getPreviousOpponents(userId, limit);

        res.json(opponents);
    } catch (err) {
        logger.error('Failed to get previous opponents', {
            error: err,
            context: { userId: req.user.id },
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

// Get challenge by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const challengeId = req.params.id;
        const userId = req.user.id;

        const challenge = await ChallengeRepository.getChallengeById(challengeId);

        if (!challenge) {
            return res.status(404).json({ error: 'Challenge not found' });
        }

        // Verify user is part of this challenge
        if (challenge.creator_id !== userId && challenge.opponent_id !== userId) {
            return res.status(403).json({ error: 'Not authorized to view this challenge' });
        }

        res.json({ challenge });
    } catch (err) {
        logger.error('Failed to get challenge', {
            error: err,
            context: { challengeId: req.params.id, userId: req.user.id },
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

// Accept a challenge
router.post('/:id/accept', authenticateToken, async (req, res) => {
    try {
        const challengeId = req.params.id;
        const userId = req.user.id;
        const { version } = req.body; // Extract version for optimistic locking

        const challenge = await ChallengeRepository.getChallengeById(challengeId);

        if (!challenge) {
            return res.status(404).json({ error: 'Challenge not found' });
        }

        if (challenge.opponent_id !== userId) {
            return res.status(403).json({ error: 'Only the challenged user can accept this challenge' });
        }

        if (challenge.status !== 'pending') {
            return res.status(400).json({ error: 'Challenge is not in pending status' });
        }

        // Update challenge status to active with version check
        await ChallengeRepository.updateChallengeStatus(challengeId, 'active', {}, version);

        // Clean up any existing sessions for this challenge (from both participants)
        const { ActiveQuizSession } = require('../models/sequelize');
        await ActiveQuizSession.destroy({
            where: { challenge_id: challengeId }
        });

        // Reset scores for both participants
        await new Promise((resolve, reject) => {
            const db = require('../db');
            db.run(
                'UPDATE challenge_participants SET score = 0, total_time_seconds = 0, completed = 0, completed_at = NULL WHERE challenge_id = ?',
                [challengeId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        logger.info('Challenge accepted and scores reset', {
            challengeId,
            userId,
            requestId: req.requestId
        });

        // Notify creator via socket that challenge was accepted
        // Notify creator via socket that challenge was accepted
        const io = req.app.get('io');

        // Create persistent notification
        await NotificationService.createNotification(
            challenge.creator_id,
            'challenge_accepted',
            'Challenge Accepted',
            `${challenge.opponent_username} accepted your challenge!`,
            { challengeId, opponentUsername: challenge.opponent_username, quizTitle: challenge.quiz_title },
            io
        );

        if (io) {
            io.to(`user_${challenge.creator_id}`).emit('challenge_accepted', {
                challengeId,
                creatorId: challenge.creator_id,
                opponentUsername: challenge.opponent_username,
                quizTitle: challenge.quiz_title
            });
        }

        res.json({ message: 'Challenge accepted', challengeId });
    } catch (err) {
        logger.error('Failed to accept challenge', {
            error: err,
            context: { challengeId: req.params.id, userId: req.user.id },
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

// Decline a challenge
router.post('/:id/decline', authenticateToken, async (req, res) => {
    try {
        const challengeId = req.params.id;
        const userId = req.user.id;
        const { version } = req.body; // Extract version for optimistic locking

        const challenge = await ChallengeRepository.getChallengeById(challengeId);

        if (!challenge) {
            return res.status(404).json({ error: 'Challenge not found' });
        }

        // Verify user is the opponent
        if (challenge.opponent_id !== userId) {
            return res.status(403).json({ error: 'Only the challenged user can decline' });
        }

        // Verify challenge is pending
        if (challenge.status !== 'pending') {
            return res.status(400).json({ error: 'Challenge is not pending' });
        }

        // Clean up any existing sessions for this challenge before deletion
        const { ActiveQuizSession } = require('../models/sequelize');
        await ActiveQuizSession.destroy({
            where: { challenge_id: challengeId }
        });

        // Delete the challenge instead of marking as declined (with version check)
        await ChallengeRepository.deleteChallenge(challengeId, userId, version);

        logger.info('Challenge declined and deleted', {
            challengeId,
            userId,
            creatorId: challenge.creator_id,
            requestId: req.requestId
        });

        // Notify creator via socket that challenge was declined
        // Notify creator via socket that challenge was declined
        const io = req.app.get('io');

        // Create persistent notification
        await NotificationService.createNotification(
            challenge.creator_id,
            'challenge_declined',
            'Challenge Declined',
            `${challenge.opponent_username} declined your challenge.`,
            { challengeId, opponentUsername: challenge.opponent_username, quizTitle: challenge.quiz_title },
            io
        );

        if (io) {
            io.to(`user_${challenge.creator_id}`).emit('challenge_declined', {
                challengeId,
                creatorId: challenge.creator_id,
                opponentUsername: challenge.opponent_username,
                quizTitle: challenge.quiz_title
            });
        }

        res.json({ message: 'Challenge declined' });
    } catch (err) {
        logger.error('Failed to decline challenge', {
            error: err,
            context: { challengeId: req.params.id, userId: req.user.id },
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

// Cancel a pending challenge
router.delete('/:id/cancel', authenticateToken, async (req, res) => {
    try {
        const challengeId = req.params.id;
        const userId = req.user.id;
        const { version } = req.body; // Extract version for optimistic locking

        // Get challenge details before deletion for notification
        const challenge = await ChallengeRepository.getChallengeById(challengeId);

        // Clean up any existing sessions for this challenge before deletion
        const { ActiveQuizSession } = require('../models/sequelize');
        await ActiveQuizSession.destroy({
            where: { challenge_id: challengeId }
        });

        await ChallengeRepository.deleteChallenge(challengeId, userId, version);

        logger.info('Challenge cancelled', {
            challengeId,
            userId,
            requestId: req.requestId
        });

        // Notify opponent via socket that challenge was cancelled
        if (challenge) {
            const io = req.app.get('io');

            // Create persistent notification
            await NotificationService.createNotification(
                challenge.opponent_id,
                'challenge_cancelled',
                'Challenge Cancelled',
                `${challenge.creator_username} cancelled the challenge.`,
                { challengeId, creatorUsername: challenge.creator_username, quizTitle: challenge.quiz_title },
                io
            );

            if (io) {
                io.to(`user_${challenge.opponent_id}`).emit('challenge_cancelled', {
                    challengeId,
                    opponentId: challenge.opponent_id,
                    creatorUsername: challenge.creator_username,
                    quizTitle: challenge.quiz_title
                });
            }
        }

        res.json({ message: 'Challenge cancelled successfully' });
    } catch (err) {
        logger.error('Failed to cancel challenge', {
            error: err,
            context: { challengeId: req.params.id, userId: req.user.id },
            requestId: req.requestId
        });
        res.status(400).json({ error: err.message });
    }
});

// Get challenge stats for user
router.get('/stats/:userId', authenticateToken, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);

        // Users can only view their own stats (or we could make this public)
        if (userId !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const stats = await ChallengeRepository.getChallengeStats(userId);

        res.json({ stats });
    } catch (err) {
        logger.error('Failed to get challenge stats', {
            error: err,
            context: { userId: req.params.userId },
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

module.exports = router;
