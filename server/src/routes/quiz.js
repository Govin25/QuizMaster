const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const logger = require('../utils/logger');
const Quiz = require('../models/Quiz');
const QuizResult = require('../models/QuizResult');
const authenticateToken = require('../middleware/authMiddleware');
const documentParser = require('../services/documentParser');
const aiQuizGenerator = require('../services/aiQuizGenerator');
const cache = require('../utils/cache');
const { uploadLimiter, createQuizLimiter } = require('../middleware/rateLimiter');
const { validateQuiz, validateQuestion, validateQuizStatus, validateId } = require('../middleware/inputValidator');

const router = express.Router();

// Configure multer for file uploads with enhanced security
const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 1 // Only allow 1 file at a time
    },
    fileFilter: (req, file, cb) => {
        // Validate MIME type
        const allowedTypes = ['application/pdf', 'text/plain'];
        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error('Invalid file type. Only PDF and TXT files are allowed.'));
        }

        // Validate file extension
        const ext = path.extname(file.originalname).toLowerCase();
        const allowedExtensions = ['.pdf', '.txt'];
        if (!allowedExtensions.includes(ext)) {
            return cb(new Error('Invalid file extension.'));
        }

        // Sanitize filename to prevent path traversal
        file.originalname = path.basename(file.originalname);

        cb(null, true);
    },
    storage: multer.diskStorage({
        destination: 'uploads/',
        filename: (req, file, cb) => {
            // Generate random filename to prevent collisions and directory traversal
            const randomName = crypto.randomBytes(16).toString('hex');
            const ext = path.extname(file.originalname);
            cb(null, `${randomName}${ext}`);
        }
    })
});

// Get public quizzes (Quiz Hub)
router.get('/public', async (req, res) => {
    try {
        const cacheKey = 'public_quizzes';

        // Check cache first
        if (cache.has(cacheKey)) {
            return res.json(cache.get(cacheKey));
        }

        const quizzes = await Quiz.getPublicQuizzes();

        // Cache for 5 minutes
        cache.set(cacheKey, quizzes, 5 * 60 * 1000);

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

// Add quiz to user's library
router.post('/:id/add-to-library', authenticateToken, async (req, res) => {
    try {
        const LibraryRepository = require('../repositories/LibraryRepository');
        const quizId = req.params.id;
        const userId = req.user.id;

        const entry = await LibraryRepository.addToLibrary(userId, quizId);

        // Invalidate user's library cache
        cache.delete(`library_${userId}`);

        res.json({ message: 'Quiz added to library', id: entry.id });
    } catch (err) {
        if (err.message === 'Quiz already in library') {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
});

// Remove quiz from user's library
router.delete('/:id/remove-from-library', authenticateToken, async (req, res) => {
    try {
        const LibraryRepository = require('../repositories/LibraryRepository');
        const quizId = req.params.id;
        const userId = req.user.id;

        const wasInLibrary = await LibraryRepository.removeFromLibrary(userId, quizId);

        // Invalidate user's library cache
        cache.delete(`library_${userId}`);

        res.json({
            message: 'Quiz removed from library',
            wasInLibrary
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Delete quiz (only draft or rejected) - MUST come after more specific routes like /remove-from-library
router.delete('/delete/:id', authenticateToken, async (req, res) => {
    try {
        const QuizRepository = require('../repositories/QuizRepository');
        const quizId = req.params.id;
        const userId = req.user.id;

        logger.debug('Quiz deletion requested', {
            quizId,
            userId,
            requestId: req.requestId
        });

        // Check if quiz exists
        const quiz = await Quiz.getById(quizId);
        if (!quiz) {
            logger.warn('Quiz deletion failed - quiz not found', {
                quizId,
                userId,
                requestId: req.requestId
            });
            return res.status(404).json({ error: 'Quiz not found' });
        }

        // Check if user owns the quiz (if creator_id exists)
        if (quiz.creator_id && quiz.creator_id !== userId) {
            logger.warn('Quiz deletion failed - unauthorized', {
                quizId,
                userId,
                creatorId: quiz.creator_id,
                requestId: req.requestId
            });
            return res.status(403).json({ error: 'Not authorized to delete this quiz' });
        }

        // Only allow deletion of draft or rejected quizzes
        if (quiz.status !== 'draft' && quiz.status !== 'rejected') {
            logger.warn('Quiz deletion failed - invalid status', {
                quizId,
                status: quiz.status,
                requestId: req.requestId
            });
            return res.status(403).json({
                error: `Cannot delete ${quiz.status} quizzes. Only draft or rejected quizzes can be deleted.`
            });
        }

        // Delete quiz
        await QuizRepository.deleteQuiz(quizId);
        logger.info('Quiz deleted successfully', {
            quizId,
            userId,
            requestId: req.requestId
        });
        res.json({ message: 'Quiz deleted successfully' });
    } catch (err) {
        logger.error('Quiz deletion failed', {
            error: err,
            context: { quizId: req.params.id, userId: req.user.id },
            requestId: req.requestId
        });
        res.status(500).json({ error: err.message });
    }
});

// Get user's quiz library (recently added + completed)
router.get('/my-library', authenticateToken, async (req, res) => {
    try {
        const LibraryRepository = require('../repositories/LibraryRepository');
        const userId = req.user.id;
        const cacheKey = `library_${userId}`;

        // Check cache first
        if (cache.has(cacheKey)) {
            return res.json(cache.get(cacheKey));
        }

        const library = await LibraryRepository.getUserLibrary(userId);

        // Cache for 1 minute
        cache.set(cacheKey, library, 60 * 1000);

        res.json(library);
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
        const quizId = req.params.id;
        const cacheKey = `quiz_${quizId}`;

        // Check cache first
        if (cache.has(cacheKey)) {
            return res.json(cache.get(cacheKey));
        }

        const quiz = await Quiz.getById(quizId);
        if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

        // Cache for 5 minutes
        cache.set(cacheKey, quiz, 5 * 60 * 1000);

        res.json(quiz);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create a new quiz
router.post('/', authenticateToken, createQuizLimiter, validateQuiz, async (req, res) => {
    try {
        const { title, category, difficulty } = req.body;
        const quiz = await Quiz.create(title, category, difficulty, req.user.id);
        res.status(201).json(quiz);
    } catch (err) {
        logger.error('Quiz creation failed', {
            error: err,
            context: { title: req.body.title, userId: req.user.id },
            requestId: req.requestId
        });
        res.status(500).json({ error: 'Failed to create quiz' });
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
        const { QuizReview } = require('../models/sequelize');
        try {
            await QuizReview.create({
                quiz_id: quizId,
                reviewer_id: req.user.id,
                status,
                comments: comments || null,
            });
        } catch (err) {
            logger.error('Failed to save quiz review', {
                error: err,
                context: { quizId, reviewerId: req.user.id },
                requestId: req.requestId
            });
        }

        res.json({ message: `Quiz ${status}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get quiz review details
router.get('/:id/review-details', authenticateToken, async (req, res) => {
    try {
        const quizId = req.params.id;
        const { QuizReview } = require('../models/sequelize');

        const review = await QuizReview.findOne({
            where: { quiz_id: quizId },
            order: [['reviewed_at', 'DESC']],
        });

        res.json(review || {});
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

        const quiz = await Quiz.create(title, category, difficulty, req.user.id, 'ai');

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

// Generate Quiz from Document
router.post('/generate-from-document', authenticateToken, uploadLimiter, upload.single('document'), async (req, res) => {
    let filePath = null;

    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No document uploaded' });
        }

        filePath = req.file.path;
        const config = JSON.parse(req.body.config || '{}');

        logger.debug('Document upload received', {
            filename: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            requestId: req.requestId
        });

        // Step 1: Extract text from document
        const extractedText = await documentParser.parseDocument(filePath, req.file.mimetype);

        if (!extractedText || extractedText.length < 100) {
            throw new Error('Document content is too short or could not be extracted');
        }

        logger.debug('Document text extracted', {
            textLength: extractedText.length,
            filename: req.file.originalname,
            requestId: req.requestId
        });

        // Step 2: Generate quiz using AI
        const questions = await aiQuizGenerator.generateQuiz(extractedText, config);

        if (!questions || questions.length === 0) {
            throw new Error('Failed to generate questions from document');
        }

        logger.debug('Questions generated from document', {
            questionCount: questions.length,
            filename: req.file.originalname,
            requestId: req.requestId
        });

        // Step 3: Format questions for frontend (don't save to DB yet)
        const title = `${config.category || 'Document'} Quiz - ${req.file.originalname}`;
        const category = config.category || 'Document-based';
        const difficulty = config.difficulty || 'medium';

        const formattedQuestions = aiQuizGenerator.formatQuestionsForDB(questions);

        // Clean up uploaded file
        await fs.unlink(filePath);

        // Return quiz data without saving to DB
        res.status(200).json({
            title,
            category,
            difficulty,
            questions: formattedQuestions,
            source: 'ai_document'
        });
    } catch (err) {
        logger.error('Document quiz generation failed', {
            error: err,
            context: {
                filename: req.file?.originalname,
                userId: req.user.id
            },
            requestId: req.requestId
        });

        // Clean up uploaded file on error
        if (filePath) {
            try {
                await fs.unlink(filePath);
            } catch (unlinkErr) {
                logger.error('Failed to delete uploaded file', {
                    error: unlinkErr,
                    context: { filePath },
                    requestId: req.requestId
                });
            }
        }

        res.status(500).json({ error: err.message });
    }
});


// Save document-generated quiz (after user confirms)
router.post('/save-document-quiz', authenticateToken, async (req, res) => {
    try {
        const { title, category, difficulty, questions } = req.body;

        if (!title || !category || !questions || questions.length < 5) {
            return res.status(400).json({ error: 'Invalid quiz data' });
        }

        // Create quiz in database
        const quiz = await Quiz.create(title, category, difficulty, req.user.id, 'ai_document');

        // Add questions to quiz
        for (const question of questions) {
            await Quiz.addQuestion(quiz.id, question);
        }

        // Fetch complete quiz with questions
        const completeQuiz = await Quiz.getById(quiz.id);

        res.status(201).json(completeQuiz);
    } catch (err) {
        logger.error('Failed to save document quiz', {
            error: err,
            context: { title: req.body.title, userId: req.user.id },
            requestId: req.requestId
        });
        res.status(500).json({ error: err.message });
    }
});

// Update quiz questions (for editing generated quizzes)
router.put('/:id/update-questions', authenticateToken, async (req, res) => {
    try {
        const quizId = req.params.id;
        const { questions } = req.body;

        // Verify ownership
        const quiz = await Quiz.getById(quizId);
        if (!quiz) {
            return res.status(404).json({ error: 'Quiz not found' });
        }
        if (quiz.creator_id !== req.user.id) {
            return res.status(403).json({ error: 'You can only update your own quizzes' });
        }

        const QuizRepository = require('../repositories/QuizRepository');

        // Update all questions
        await QuizRepository.updateQuestions(quizId, questions);

        // Fetch updated quiz
        const updatedQuiz = await Quiz.getById(quizId);

        res.json(updatedQuiz);
    } catch (err) {
        logger.error('Failed to update quiz questions', {
            error: err,
            context: { quizId: req.params.id, userId: req.user.id },
            requestId: req.requestId
        });
        res.status(500).json({ error: err.message });
    }
});


// Add a question to a quiz
router.post('/:id/questions', authenticateToken, validateQuestion, async (req, res) => {
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
        logger.error('Failed to add question to quiz', {
            error: err,
            context: { quizId: req.params.id, userId: req.user.id },
            requestId: req.requestId
        });
        res.status(500).json({ error: 'Failed to add question' });
    }
});

// Update a question
router.put('/questions/:questionId', authenticateToken, async (req, res) => {
    try {
        const { Question } = require('../models/sequelize');
        const questionId = req.params.questionId;

        // Get question with quiz to verify ownership
        const question = await Question.findByPk(questionId, {
            include: [{ model: require('../models/sequelize').Quiz, as: 'quiz' }]
        });

        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        if (question.quiz.creator_id !== req.user.id) {
            return res.status(403).json({ error: 'You can only update questions in your own quizzes' });
        }

        // Update question
        await question.update({
            type: req.body.type,
            question_text: req.body.text,
            options: req.body.options,
            correct_answer: req.body.correctAnswer,
        });

        res.json({ message: 'Question updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a question
router.delete('/questions/:questionId', authenticateToken, async (req, res) => {
    try {
        const { Question, QuestionAttempt } = require('../models/sequelize');
        const questionId = req.params.questionId;

        // Get question with quiz to verify ownership
        const question = await Question.findByPk(questionId, {
            include: [{ model: require('../models/sequelize').Quiz, as: 'quiz' }]
        });

        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        if (question.quiz.creator_id !== req.user.id) {
            return res.status(403).json({ error: 'You can only delete questions from your own quizzes' });
        }

        // Delete related question attempts first
        await QuestionAttempt.destroy({ where: { question_id: questionId } });

        // Delete the question
        await question.destroy();

        res.json({ message: 'Question deleted successfully' });
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
