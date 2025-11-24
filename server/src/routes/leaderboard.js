const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
    const filter = req.query.filter || 'best'; // 'best' or 'all'
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Search filters
    const playerSearch = req.query.player || '';
    const quizSearch = req.query.quiz || '';
    const attemptSearch = req.query.attempt || '';

    let baseQuery = '';
    let countQuery = '';
    let params = [];
    let whereConditions = [];

    // Build WHERE clause based on search params
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
    `;

    if (filter === 'all') {
        // For 'all' filter, we can search by attempt number too
        // Note: attemptNumber is a derived column in the main query, 
        // so filtering by it in WHERE requires a subquery or HAVING, 
        // but for simplicity and performance in SQLite, we might need to be careful.
        // The original query calculated attemptNumber on the fly.

        // Let's reconstruct the query to handle filtering efficiently.
        // Since attemptNumber is complex to filter in WHERE without a subquery,
        // and user wants to search "Attempt", we'll handle it.

        // However, the requirement says "search functionalities on columns Player, Quiz and Attempt".
        // Attempt search is usually "Attempt #1", "Attempt #2". 
        // If the user inputs "1", they might mean attempt 1.

        // Let's assume attemptSearch is a number.

        let attemptCondition = '';
        // Construct the base inner query
        let innerQuery = `
            SELECT 
                u.username, 
                r.score, 
                q.title as quizTitle, 
                r.completed_at,
                (
                    SELECT COUNT(*) 
                    FROM results r2 
                    WHERE r2.user_id = r.user_id 
                    AND r2.quiz_id = r.quiz_id 
                    AND r2.completed_at <= r.completed_at
                ) as attemptNumber
            ${fromClause}
        `;

        // Add WHERE conditions for player and quiz to the inner query
        if (whereConditions.length > 0) {
            innerQuery += ' WHERE ' + whereConditions.join(' AND ');
        }

        // Now wrap it to handle attempt filtering
        let querySQL = `SELECT * FROM (${innerQuery})`;
        let outerWhereConditions = [];

        if (attemptSearch) {
            outerWhereConditions.push(`attemptNumber = ?`);
            params.push(parseInt(attemptSearch));
        }

        if (outerWhereConditions.length > 0) {
            querySQL += ' WHERE ' + outerWhereConditions.join(' AND ');
        }

        // Count query based on the fully filtered query (before pagination)
        countQuery = `SELECT COUNT(*) as total FROM (${querySQL})`;

        // Add ordering and pagination
        querySQL += ` ORDER BY completed_at DESC LIMIT ? OFFSET ?`;

        db.get(countQuery, params, (err, countResult) => {
            if (err) return res.status(500).json({ error: err.message });

            const total = countResult ? countResult.total : 0;
            const totalPages = Math.ceil(total / limit);

            // Now execute data query
            const dataParams = [...params, limit, offset];

            db.all(querySQL, dataParams, (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({
                    data: rows,
                    meta: {
                        total,
                        page,
                        limit,
                        totalPages
                    }
                });
            });
        });

    } else {
        // 'best' filter
        // Logic: Best score per user per quiz.
        // We need to filter this derived dataset.

        // Base query for 'best'
        /*
        SELECT 
            u.username, 
            r.score, 
            q.title as quizTitle, 
            r.completed_at
        FROM results r
        JOIN users u ON r.user_id = u.id
        JOIN quizzes q ON r.quiz_id = q.id
        JOIN (
            SELECT user_id, quiz_id, MAX(score) as max_score
            FROM results
            GROUP BY user_id, quiz_id
        ) best ON r.user_id = best.user_id 
            AND r.quiz_id = best.quiz_id 
            AND r.score = best.max_score
        GROUP BY r.user_id, r.quiz_id
        */

        // We can add WHERE clauses to this.
        // Note: attempt search is not applicable for 'best' view usually, or it's always the best attempt.
        // The UI shows "Attempt" column only for 'all'.
        // So we ignore attemptSearch for 'best'.

        let bestQuery = `
            SELECT 
                u.username, 
                r.score, 
                q.title as quizTitle, 
                r.completed_at
            FROM results r
            JOIN users u ON r.user_id = u.id
            JOIN quizzes q ON r.quiz_id = q.id
            JOIN (
                SELECT user_id, quiz_id, MAX(score) as max_score
                FROM results
                GROUP BY user_id, quiz_id
            ) best ON r.user_id = best.user_id 
                AND r.quiz_id = best.quiz_id 
                AND r.score = best.max_score
        `;

        // We need to ensure we only get one row per user/quiz (GROUP BY)
        // The original query had GROUP BY r.user_id, r.quiz_id

        if (whereConditions.length > 0) {
            bestQuery += ' WHERE ' + whereConditions.join(' AND ');
        }

        bestQuery += ` GROUP BY r.user_id, r.quiz_id`;

        // Count query
        // We need to count the groups.
        // SELECT COUNT(*) FROM (SELECT ... GROUP BY ...)
        let bestCountQuery = `SELECT COUNT(*) as total FROM (${bestQuery})`;

        bestQuery += ` ORDER BY r.score DESC LIMIT ? OFFSET ?`;

        db.get(bestCountQuery, params, (err, countResult) => {
            if (err) return res.status(500).json({ error: err.message });

            const total = countResult ? countResult.total : 0;
            const totalPages = Math.ceil(total / limit);

            const dataParams = [...params, limit, offset];

            db.all(bestQuery, dataParams, (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({
                    data: rows,
                    meta: {
                        total,
                        page,
                        limit,
                        totalPages
                    }
                });
            });
        });
    }
});

module.exports = router;
