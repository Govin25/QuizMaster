const express = require('express');
const logger = require('../utils/logger');
const db = require('../db');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * Calculate XP to award based on quiz score
 * - Base: 10 XP for completing any quiz
 * - Score bonus: score / 10 (rounded) = 0-10 XP
 * - Perfect score bonus: +15 XP
 */
function calculateXP(score) {
    let xp = 10; // Base XP for completing quiz
    xp += Math.round(score / 10); // 0-10 XP based on score
    if (score === 100) {
        xp += 15; // Perfect score bonus
    }
    return xp;
}

router.get('/:userId', authenticateToken, (req, res) => {
    const userId = parseInt(req.params.userId);

    // Authorization: Users can only access their own results
    if (req.user.id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
    }

    const query = `
    SELECT quiz_id, MAX(score) as best_score, COUNT(*) as attempts
    FROM results
    WHERE user_id = ?
    GROUP BY quiz_id
  `;

    db.all(query, [userId], (err, rows) => {
        if (err) {
            logger.error('Failed to fetch user results', {
                error: err,
                context: { userId },
                requestId: req.requestId
            });
            return res.status(500).json({ error: 'Failed to fetch results' });
        }
        res.json(rows);
    });
});

// POST endpoint to save a new result
router.post('/', authenticateToken, (req, res) => {
    const { quizId, score } = req.body;
    const userId = req.user.id;

    if (!quizId || score === undefined) {
        return res.status(400).json({ error: 'Missing required fields: quizId, score' });
    }

    const query = `
        INSERT INTO results (user_id, quiz_id, score, completed_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `;

    db.run(query, [userId, quizId, score], function (err) {
        if (err) {
            logger.error('Failed to save result', {
                error: err,
                context: { userId, quizId, score },
                requestId: req.requestId
            });
            return res.status(500).json({ error: 'Failed to save result' });
        }

        const resultId = this.lastID;

        // Calculate and award XP
        const xpEarned = calculateXP(score);

        db.run(
            `UPDATE users SET xp = COALESCE(xp, 0) + ? WHERE id = ?`,
            [xpEarned, userId],
            function (xpErr) {
                if (xpErr) {
                    logger.error('Failed to award XP', {
                        error: xpErr,
                        context: { userId, xpEarned },
                        requestId: req.requestId
                    });
                    // Don't fail the request, just log the error
                }

                logger.info('Result saved successfully', {
                    resultId,
                    userId,
                    quizId,
                    score,
                    xpEarned,
                    requestId: req.requestId
                });

                res.status(201).json({
                    message: 'Result saved successfully',
                    resultId,
                    xpEarned
                });
            }
        );
    });
});

module.exports = router;
