const express = require('express');
const logger = require('../utils/logger');
const db = require('../db');
const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();

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

module.exports = router;
