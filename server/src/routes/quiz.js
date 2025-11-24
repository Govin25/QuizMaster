const express = require('express');
const Quiz = require('../models/Quiz');
const QuizResult = require('../models/QuizResult');
const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();

// Get public quizzes (Quiz Hub)
router.get('/public', async (req, res) => {
    try {
        const quizzes = await Quiz.getPublicQuizzes();
        res.json(quizzes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get user's quizzes
router.get('/my-quizzes', authenticateToken, async (req, res) => {
    try {
        const quizzes = await Quiz.getUserQuizzes(req.user.id);
        res.json(quizzes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all quizzes (Admin/Debug or public fallback? Keeping as is for now but maybe restrict?)
// For now, let's keep it but maybe it should only return public ones? 
// The requirement says "any other user can search for any topics... and pull those quizzes".
// So GET / should probably return public quizzes or all if admin. 
// Let's leave it as "all" for backward compatibility but maybe filter in frontend.
router.get('/', async (req, res) => {
    try {
        const quizzes = await Quiz.getAll();
        res.json(quizzes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get a specific quiz by ID
router.get('/:id', async (req, res) => {
    try {
        const quiz = await Quiz.getById(req.params.id);
        if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
        res.json(quiz);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create a new quiz
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { title, category, difficulty } = req.body;
        const quiz = await Quiz.create(title, category, difficulty, req.user.id);
        res.status(201).json(quiz);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Request Review (Publish)
router.post('/:id/publish', authenticateToken, async (req, res) => {
    try {
        const quizId = req.params.id;
        // Verify ownership
        const quiz = await Quiz.getById(quizId);
        if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
        if (quiz.creator_id !== req.user.id) {
            return res.status(403).json({ error: 'You can only publish your own quizzes' });
        }

        await Quiz.updateStatus(quizId, 'pending_review', 0);
        res.json({ message: 'Quiz submitted for review' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Review Quiz (Approve/Reject)
router.post('/:id/review', authenticateToken, async (req, res) => {
    try {
        const quizId = req.params.id;
        const { status, comments } = req.body; // status: 'approved' or 'rejected'

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const isPublic = status === 'approved' ? 1 : 0;
        await Quiz.updateStatus(quizId, status, isPublic);

        // Log review in quiz_reviews table
        const db = require('../db');
        db.run(
            'INSERT INTO quiz_reviews (quiz_id, reviewer_id, status, comments) VALUES (?, ?, ?, ?)',
            [quizId, req.user.id, status, comments || null],
            (err) => {
                if (err) console.error('Error saving review:', err);
            }
        );

        res.json({ message: `Quiz ${status}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get quiz review details
router.get('/:id/review-details', authenticateToken, async (req, res) => {
    try {
        const quizId = req.params.id;
        const db = require('../db');

        db.get(
            'SELECT * FROM quiz_reviews WHERE quiz_id = ? ORDER BY reviewed_at DESC LIMIT 1',
            [quizId],
            (err, row) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json(row || {});
            }
        );
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Generate Quiz with AI
router.post('/generate', authenticateToken, async (req, res) => {
    try {
        const { topic, difficulty } = req.body;
        // TODO: Integrate with actual AI service
        // For now, create a mock quiz
        const title = `AI Generated: ${topic}`;
        const category = 'AI Generated';

        const quiz = await Quiz.create(title, category, difficulty, req.user.id);

        // Add some mock questions
        const mockQuestions = [
            { type: 'true_false', text: `Is ${topic} interesting?`, correctAnswer: 'true' },
            { type: 'multiple_choice', text: `What is the best thing about ${topic}?`, options: ['Everything', 'Nothing', 'Something', 'Idk'], correctAnswer: 'Everything' }
        ];

        for (const q of mockQuestions) {
            await Quiz.addQuestion(quiz.id, q);
        }

        res.status(201).json(quiz);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add a question to a quiz
router.post('/:id/questions', authenticateToken, async (req, res) => {
    try {
        const quizId = req.params.id;
        // Verify ownership
        const quiz = await Quiz.getById(quizId);
        if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
        if (quiz.creator_id !== req.user.id) {
            return res.status(403).json({ error: 'You can only add questions to your own quizzes' });
        }

        const questionId = await Quiz.addQuestion(quizId, req.body);
        res.status(201).json({ id: questionId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get detailed quiz report
router.get('/results/:resultId/report', async (req, res) => {
    try {
        const report = await QuizResult.getQuizReport(req.params.resultId);
        if (!report) return res.status(404).json({ error: 'Report not found' });
        res.json(report);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get question analysis
router.get('/questions/:questionId/analysis', async (req, res) => {
    try {
        const userId = req.query.userId || null;
        const analysis = await QuizResult.getQuestionAnalysis(req.params.questionId, userId);
        if (!analysis) return res.status(404).json({ error: 'Question not found' });
        res.json(analysis);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all attempts for a quiz by a user
router.get('/:quizId/attempts/:userId', async (req, res) => {
    try {
        const attempts = await QuizResult.getUserQuizAttempts(req.params.quizId, req.params.userId);
        res.json(attempts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
