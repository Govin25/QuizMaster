const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const logger = require('../utils/logger');
const db = require('../db');

// Add a quiz to library
router.post('/add', authenticateToken, async (req, res) => {
    try {
        const { quizId } = req.body;
        const userId = req.user.id;

        if (!quizId) {
            return res.status(400).json({ error: 'Quiz ID is required' });
        }

        // Check if already in library
        const checkQuery = `SELECT id FROM user_quiz_library WHERE user_id = ? AND quiz_id = ?`;
        db.get(checkQuery, [userId, quizId], (err, row) => {
            if (err) {
                logger.error('Error checking library', { error: err });
                return res.status(500).json({ error: 'Internal server error' });
            }

            if (row) {
                return res.status(409).json({ error: 'Quiz already in library' });
            }

            const insertQuery = `INSERT INTO user_quiz_library (user_id, quiz_id) VALUES (?, ?)`;
            db.run(insertQuery, [userId, quizId], function (err) {
                if (err) {
                    logger.error('Error adding to library', { error: err });
                    return res.status(500).json({ error: 'Failed to add quiz to library' });
                }

                res.status(201).json({ message: 'Quiz added to library' });
            });
        });
    } catch (err) {
        logger.error('Add to library error', { error: err });
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Remove a quiz from library
router.delete('/remove/:quizId', authenticateToken, async (req, res) => {
    try {
        const { quizId } = req.params;
        const userId = req.user.id;

        const deleteQuery = `DELETE FROM user_quiz_library WHERE user_id = ? AND quiz_id = ?`;
        db.run(deleteQuery, [userId, quizId], function (err) {
            if (err) {
                logger.error('Error removing from library', { error: err });
                return res.status(500).json({ error: 'Failed to remove quiz from library' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ error: 'Quiz not found in library' });
            }

            res.json({ message: 'Quiz removed from library' });
        });
    } catch (err) {
        logger.error('Remove from library error', { error: err });
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Check if quiz is in library
router.get('/check/:quizId', authenticateToken, async (req, res) => {
    try {
        const { quizId } = req.params;
        const userId = req.user.id;

        const query = `SELECT id FROM user_quiz_library WHERE user_id = ? AND quiz_id = ?`;
        db.get(query, [userId, quizId], (err, row) => {
            if (err) {
                logger.error('Error checking library status', { error: err });
                return res.status(500).json({ error: 'Internal server error' });
            }

            res.json({ inLibrary: !!row });
        });
    } catch (err) {
        logger.error('Library check error', { error: err });
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user's library
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 20, offset = 0 } = req.query;

        const query = `
            SELECT q.*, uql.added_at 
            FROM quizzes q
            JOIN user_quiz_library uql ON q.id = uql.quiz_id
            WHERE uql.user_id = ?
            ORDER BY uql.added_at DESC
            LIMIT ? OFFSET ?
        `;

        db.all(query, [userId, limit, offset], (err, rows) => {
            if (err) {
                logger.error('Error fetching library', { error: err });
                return res.status(500).json({ error: 'Failed to fetch library' });
            }

            // Parse necessary JSON fields if quizzes table has them as string
            // Assuming simplified response for now is fine

            res.json({ quizzes: rows });
        });
    } catch (err) {
        logger.error('Fetch library error', { error: err });
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
