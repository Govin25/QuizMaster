const express = require('express');
const db = require('../db');
const authenticateToken = require('../middleware/authMiddleware');
const cache = require('../utils/cache');
const { validateSearch } = require('../middleware/inputValidator');

const router = express.Router();

router.get('/', authenticateToken, validateSearch, (req, res) => {
    const filter = req.query.filter || 'first'; // Default to 'first'
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100); // Cap at 100
    const offset = (page - 1) * limit;
    const myQuizzesOnly = req.query.myQuizzesOnly === 'true';

    // Search filters - already validated by validateSearch middleware
    const playerSearch = req.query.player ? req.query.player.trim() : '';
    const quizSearch = req.query.quiz ? req.query.quiz.trim() : '';
    const attemptSearch = req.query.attempt ? parseInt(req.query.attempt) : '';

    // Create cache key based on all query parameters
    const cacheKey = `leaderboard_${filter}_${page}_${limit}_${myQuizzesOnly}_${playerSearch}_${quizSearch}_${attemptSearch}_${req.user.id}`;

    // Check cache first
    if (cache.has(cacheKey)) {
        return res.json(cache.get(cacheKey));
    }

    let params = [];
    let whereConditions = [];

    // Ensure only public quizzes are shown in leaderboard
    whereConditions.push(`q.is_public = 1`);

    // Filter by quizzes user participated in
    if (myQuizzesOnly && req.user) {
        whereConditions.push(`q.id IN (SELECT quiz_id FROM results WHERE user_id = ?)`);
        params.push(req.user.id);
    }

    // Build WHERE clause based on search params - using parameterized queries
    if (playerSearch) {
        whereConditions.push(`u.username LIKE ?`);
        params.push(`%${playerSearch}%`);
    }
    if (quizSearch) {
        whereConditions.push(`q.title LIKE ?`);
        params.push(`%${quizSearch}%`);
    }

    // Base FROM and JOINs
    let fromClause = `
        FROM results r
        JOIN users u ON r.user_id = u.id
        JOIN quizzes q ON r.quiz_id = q.id
        LEFT JOIN (
            SELECT quiz_id, COUNT(*) as total_questions 
            FROM questions 
            GROUP BY quiz_id
        ) qc ON q.id = qc.quiz_id
    `;

    if (filter === 'all') {
        let attemptCondition = '';
        let innerQuery = `
            SELECT 
                u.username, 
                r.score, 
                q.title as quizTitle, 
                r.completed_at,
                qc.total_questions,
                CASE 
                    WHEN qc.total_questions > 0 THEN ROUND((r.score * 100.0) / (qc.total_questions * 10), 1)
                    ELSE 0 
                END as percentage,
                (
                    SELECT COUNT(*) 
                    FROM results r2 
                    WHERE r2.user_id = r.user_id 
                    AND r2.quiz_id = r.quiz_id 
                    AND r2.completed_at <= r.completed_at
                ) as attemptNumber
            ${fromClause}
        `;

        if (whereConditions.length > 0) {
            innerQuery += ' WHERE ' + whereConditions.join(' AND ');
        }

        let querySQL = `SELECT * FROM (${innerQuery})`;
        let outerWhereConditions = [];

        if (attemptSearch) {
            outerWhereConditions.push(`attemptNumber = ?`);
            params.push(parseInt(attemptSearch));
        }

        if (outerWhereConditions.length > 0) {
            querySQL += ' WHERE ' + outerWhereConditions.join(' AND ');
        }

        let countQuery = `SELECT COUNT(*) as total FROM (${querySQL})`;
        // Sort by percentage DESC, then score DESC (as tiebreaker), then date DESC
        querySQL += ` ORDER BY percentage DESC, score DESC, completed_at DESC LIMIT ? OFFSET ?`;

        db.get(countQuery, params, (err, countResult) => {
            if (err) return res.status(500).json({ error: err.message });

            const total = countResult ? countResult.total : 0;
            const totalPages = Math.ceil(total / limit);
            const dataParams = [...params, limit, offset];

            db.all(querySQL, dataParams, (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                const result = {
                    data: rows,
                    meta: { total, page, limit, totalPages }
                };
                // Cache for 30 seconds
                cache.set(cacheKey, result, 30 * 1000);
                res.json(result);
            });
        });

    } else {
        // 'first' filter (replaces 'best')
        // Logic: First attempt per user per quiz.

        let firstQuery = `
            SELECT 
                u.username, 
                r.score, 
                q.title as quizTitle, 
                r.completed_at,
                qc.total_questions,
                CASE 
                    WHEN qc.total_questions > 0 THEN ROUND((r.score * 100.0) / (qc.total_questions * 10), 1)
                    ELSE 0 
                END as percentage
            FROM results r
            JOIN users u ON r.user_id = u.id
            JOIN quizzes q ON r.quiz_id = q.id
            LEFT JOIN (
                SELECT quiz_id, COUNT(*) as total_questions 
                FROM questions 
                GROUP BY quiz_id
            ) qc ON q.id = qc.quiz_id
            JOIN (
                SELECT user_id, quiz_id, MIN(completed_at) as first_attempt_date
                FROM results
                GROUP BY user_id, quiz_id
            ) first_attempt ON r.user_id = first_attempt.user_id 
                AND r.quiz_id = first_attempt.quiz_id 
                AND r.completed_at = first_attempt.first_attempt_date
        `;

        if (whereConditions.length > 0) {
            firstQuery += ' WHERE ' + whereConditions.join(' AND ');
        }

        // No need for GROUP BY here as the JOIN ensures uniqueness per user/quiz
        // But just in case of timestamp collision (rare), GROUP BY handles it.
        firstQuery += ` GROUP BY r.user_id, r.quiz_id`;

        let firstCountQuery = `SELECT COUNT(*) as total FROM (${firstQuery})`;
        // Sort by percentage DESC
        firstQuery += ` ORDER BY percentage DESC, r.score DESC LIMIT ? OFFSET ?`;

        db.get(firstCountQuery, params, (err, countResult) => {
            if (err) return res.status(500).json({ error: err.message });

            const total = countResult ? countResult.total : 0;
            const totalPages = Math.ceil(total / limit);
            const dataParams = [...params, limit, offset];

            db.all(firstQuery, dataParams, (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                const result = {
                    data: rows,
                    meta: { total, page, limit, totalPages }
                };
                // Cache for 30 seconds
                cache.set(cacheKey, result, 30 * 1000);
                res.json(result);
            });
        });
    }
});

module.exports = router;
