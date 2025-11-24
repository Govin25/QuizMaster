const express = require('express');
const Quiz = require('../models/Quiz');
const QuizResult = require('../models/QuizResult');

const router = express.Router();

// Get all quizzes
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

// Create a new quiz (for seeding/admin)
router.post('/', async (req, res) => {
    try {
        const { title, category, difficulty } = req.body;
        const quiz = await Quiz.create(title, category, difficulty);
        res.status(201).json(quiz);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add a question to a quiz
router.post('/:id/questions', async (req, res) => {
    try {
        const quizId = req.params.id;
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
