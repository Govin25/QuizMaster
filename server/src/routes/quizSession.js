const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { authenticateToken } = require('../middleware/authMiddleware');
const { ActiveQuizSession } = require('../models/sequelize');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const { handleError } = require('../utils/errorHandler');

// Session timeout: 5 minutes of no heartbeat
const SESSION_TIMEOUT = 5 * 60 * 1000;

/**
 * Start a quiz session
 * POST /api/quiz-sessions/start
 */
router.post('/start', authenticateToken, async (req, res) => {
    try {
        const { quizId, challengeId } = req.body;
        const userId = req.user.id;

        // Validate: must have either quizId or challengeId, not both
        if ((!quizId && !challengeId) || (quizId && challengeId)) {
            return res.status(400).json({ error: 'Must provide either quizId or challengeId' });
        }

        // Build where clause based on session type
        const whereClause = challengeId
            ? { user_id: userId, challenge_id: challengeId }
            : { user_id: userId, quiz_id: quizId };

        // Check for existing active session
        const existing = await ActiveQuizSession.findOne({ where: whereClause });

        if (existing) {
            // Check if session is stale
            const lastHeartbeat = new Date(existing.last_heartbeat).getTime();
            const isStale = Date.now() - lastHeartbeat > SESSION_TIMEOUT;

            if (!isStale) {
                logger.warn('Session already active', {
                    userId,
                    quizId,
                    challengeId,
                    sessionToken: existing.session_token,
                    requestId: req.requestId
                });

                return res.status(409).json({
                    canStart: false,
                    message: challengeId
                        ? 'Challenge is already active in another session. Please close it first.'
                        : 'Quiz is already active in another session. Please close it first.',
                    sessionToken: null
                });
            }

            // Remove stale session
            await existing.destroy();
            logger.info('Removed stale session', {
                userId,
                quizId,
                challengeId,
                requestId: req.requestId
            });
        }

        // Create new session
        const sessionToken = crypto.randomBytes(32).toString('hex');
        const sessionData = {
            user_id: userId,
            session_token: sessionToken
        };

        if (challengeId) {
            sessionData.challenge_id = challengeId;
        } else {
            sessionData.quiz_id = quizId;
        }

        const session = await ActiveQuizSession.create(sessionData);

        logger.info('Session started', {
            userId,
            quizId,
            challengeId,
            sessionToken,
            requestId: req.requestId
        });

        res.json({
            canStart: true,
            sessionToken,
            message: 'Session started successfully'
        });
    } catch (err) {
        logger.error('Failed to start session', {
            error: err,
            context: { quizId: req.body.quizId, challengeId: req.body.challengeId, userId: req.user?.id },
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

/**
 * Heartbeat to keep session alive
 * POST /api/quiz-sessions/heartbeat
 */
router.post('/heartbeat', authenticateToken, async (req, res) => {
    try {
        const { quizId, challengeId, sessionToken } = req.body;
        const userId = req.user.id;

        if ((!quizId && !challengeId) || !sessionToken) {
            return res.status(400).json({ error: 'Session token and either quizId or challengeId are required' });
        }

        const whereClause = {
            user_id: userId,
            session_token: sessionToken
        };

        if (challengeId) {
            whereClause.challenge_id = challengeId;
        } else {
            whereClause.quiz_id = quizId;
        }

        const session = await ActiveQuizSession.findOne({ where: whereClause });

        if (!session) {
            logger.warn('Heartbeat for non-existent session', {
                userId,
                quizId,
                challengeId,
                sessionToken,
                requestId: req.requestId
            });
            return res.status(404).json({ active: false });
        }

        // Update heartbeat timestamp
        await session.update({ last_heartbeat: new Date() });

        res.json({ active: true });
    } catch (err) {
        logger.error('Heartbeat failed', {
            error: err,
            context: { quizId: req.body.quizId, challengeId: req.body.challengeId, userId: req.user?.id },
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

/**
 * End quiz session
 * POST /api/quiz-sessions/end
 */
router.post('/end', authenticateToken, async (req, res) => {
    try {
        const { quizId, challengeId, sessionToken } = req.body;
        const userId = req.user.id;

        if ((!quizId && !challengeId) || !sessionToken) {
            return res.status(400).json({ error: 'Session token and either quizId or challengeId are required' });
        }

        const whereClause = {
            user_id: userId,
            session_token: sessionToken
        };

        if (challengeId) {
            whereClause.challenge_id = challengeId;
        } else {
            whereClause.quiz_id = quizId;
        }

        const deleted = await ActiveQuizSession.destroy({ where: whereClause });

        if (deleted > 0) {
            logger.info('Session ended', {
                userId,
                quizId,
                challengeId,
                sessionToken,
                requestId: req.requestId
            });
        }

        res.json({ success: true });
    } catch (err) {
        logger.error('Failed to end session', {
            error: err,
            context: { quizId: req.body.quizId, challengeId: req.body.challengeId, userId: req.user?.id },
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

/**
 * Check session status
 * GET /api/quiz-sessions/status/:quizId
 */
router.get('/status/:quizId', authenticateToken, async (req, res) => {
    try {
        const quizId = parseInt(req.params.quizId);
        const userId = req.user.id;

        if (isNaN(quizId)) {
            return res.status(400).json({ error: 'Invalid quiz ID' });
        }

        const session = await ActiveQuizSession.findOne({
            where: { user_id: userId, quiz_id: quizId }
        });

        if (!session) {
            return res.json({ hasActiveSession: false });
        }

        // Check if stale
        const lastHeartbeat = new Date(session.last_heartbeat).getTime();
        const isStale = Date.now() - lastHeartbeat > SESSION_TIMEOUT;

        if (isStale) {
            await session.destroy();
            logger.info('Removed stale session during status check', {
                userId,
                quizId,
                requestId: req.requestId
            });
            return res.json({ hasActiveSession: false });
        }

        res.json({
            hasActiveSession: true,
            sessionToken: session.session_token,
            startedAt: session.started_at
        });
    } catch (err) {
        logger.error('Failed to check session status', {
            error: err,
            context: { quizId: req.params.quizId, userId: req.user?.id },
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

/**
 * Cleanup stale sessions
 * POST /api/quiz-sessions/cleanup
 */
router.post('/cleanup', authenticateToken, async (req, res) => {
    try {
        const staleTime = new Date(Date.now() - SESSION_TIMEOUT);

        const deleted = await ActiveQuizSession.destroy({
            where: {
                last_heartbeat: { [Op.lt]: staleTime }
            }
        });

        logger.info('Cleaned up stale sessions', {
            count: deleted,
            userId: req.user.id,
            requestId: req.requestId
        });

        res.json({ cleaned: deleted });
    } catch (err) {
        logger.error('Cleanup failed', {
            error: err,
            userId: req.user?.id,
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

module.exports = router;
