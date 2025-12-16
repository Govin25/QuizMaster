const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const logger = require('../utils/logger');
const Quiz = require('../models/Quiz');
const QuizResult = require('../models/QuizResult');
const { authenticateToken, requirePermission } = require('../middleware/authMiddleware');
const documentParser = require('../services/documentParser');
const aiQuizGenerator = require('../services/aiQuizGenerator');
const videoQuizService = require('../services/videoQuizService');
const cache = require('../utils/cache');
const { uploadLimiter, createQuizLimiter } = require('../middleware/rateLimiter');
const { validateQuiz, validateQuestion, validateQuizStatus, validateId } = require('../middleware/inputValidator');
const { handleError } = require('../utils/errorHandler');

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

// Get public quizzes (Quiz Hub) with optional limit
router.get('/public', async (req, res) => {
    try {
        // Default limit of 50, max 100 to prevent unbounded queries
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const cacheKey = `public_quizzes_${limit}`;

        // Check cache first
        if (cache.has(cacheKey)) {
            return res.json(cache.get(cacheKey));
        }

        const quizzes = await Quiz.getPublicQuizzes(limit);

        // Cache for 5 minutes
        cache.set(cacheKey, quizzes, 5 * 60 * 1000);

        res.json(quizzes);
    } catch (err) {
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

// Get recommended quizzes for user
router.get('/recommended', authenticateToken, async (req, res) => {
    try {
        const recommendationService = require('../services/recommendationService');
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 10;
        const cacheKey = `recommendations_${userId}`;

        // Check cache first
        if (cache.has(cacheKey)) {
            return res.json(cache.get(cacheKey));
        }

        const recommendations = await recommendationService.getRecommendations(userId, limit);

        // Cache for 3 minutes
        cache.set(cacheKey, recommendations, 3 * 60 * 1000);

        res.json(recommendations);
    } catch (err) {
        logger.error('Failed to get recommendations', {
            error: err,
            context: { userId: req.user.id },
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

// Get quizzes grouped by category
router.get('/by-category', async (req, res) => {
    try {
        const recommendationService = require('../services/recommendationService');
        const limit = parseInt(req.query.limit) || 6;
        const offset = parseInt(req.query.offset) || 0;
        const cacheKey = `quizzes_by_category_${limit}_${offset}`;

        // Check cache first
        if (cache.has(cacheKey)) {
            return res.json(cache.get(cacheKey));
        }

        const quizzesByCategory = await recommendationService.getQuizzesByCategory(limit, offset);

        // Cache for 5 minutes
        cache.set(cacheKey, quizzesByCategory, 5 * 60 * 1000);

        res.json(quizzesByCategory);
    } catch (err) {
        logger.error('Failed to get quizzes by category', {
            error: err,
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

// Get all categories
router.get('/categories', async (req, res) => {
    try {
        const recommendationService = require('../services/recommendationService');
        const cacheKey = 'all_categories';

        // Check cache first
        if (cache.has(cacheKey)) {
            return res.json(cache.get(cacheKey));
        }

        const categories = await recommendationService.getAllCategories();

        // Cache for 10 minutes
        cache.set(cacheKey, categories, 10 * 60 * 1000);

        res.json(categories);
    } catch (err) {
        logger.error('Failed to get categories', {
            error: err,
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

// Get quizzes from a specific category (with pagination)
router.get('/by-category/:category', async (req, res) => {
    try {
        const recommendationService = require('../services/recommendationService');
        const { category } = req.params;
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;
        const cacheKey = `quizzes_category_${category}_${limit}_${offset}`;

        // Check cache first
        if (cache.has(cacheKey)) {
            return res.json(cache.get(cacheKey));
        }

        const quizzes = await recommendationService.getQuizzesBySpecificCategory(category, limit, offset);

        // Cache for 5 minutes
        cache.set(cacheKey, quizzes, 5 * 60 * 1000);

        res.json(quizzes);
    } catch (err) {
        logger.error('Failed to get quizzes by category', {
            error: err,
            context: { category: req.params.category },
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});


// Get user's quizzes
router.get('/my-quizzes', authenticateToken, async (req, res) => {
    try {
        const quizzes = await Quiz.getUserQuizzes(req.user.id);
        res.json(quizzes);
    } catch (err) {
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
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
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
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
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});


// Delete quiz (only draft or rejected) - MUST come after more specific routes like /remove-from-library
router.delete('/delete/:id', authenticateToken, async (req, res) => {
    try {
        const QuizRepository = require('../repositories/QuizRepository');
        const quizId = req.params.id;
        const userId = req.user.id;
        const { version } = req.body; // Extract version for optimistic locking

        logger.debug('Quiz deletion requested', {
            quizId,
            userId,
            version,
            requestId: req.requestId
        });

        // Check if quiz exists
        const quiz = await Quiz.getById(quizId);
        if (!quiz) {
            // Idempotent: If quiz doesn't exist, it's already deleted - return success
            logger.info('Quiz deletion - already deleted', {
                quizId,
                userId,
                requestId: req.requestId
            });
            return res.json({ message: 'Quiz deleted successfully' });
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

        // Remove quiz from all users' libraries before deletion
        const LibraryRepository = require('../repositories/LibraryRepository');
        await LibraryRepository.removeQuizFromAllLibraries(quizId);

        logger.debug('Removed quiz from all libraries', {
            quizId,
            requestId: req.requestId
        });

        // Delete quiz with version check
        await QuizRepository.deleteQuiz(quizId, version);

        // Invalidate library caches for all users (pattern delete)
        cache.deletePattern('library_*');

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
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
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
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

// Search quizzes for challenge creation
router.get('/search-for-challenge', authenticateToken, async (req, res) => {
    try {
        const QuizRepository = require('../repositories/QuizRepository');
        const userId = req.user.id;
        const { query, filter = 'all' } = req.query;

        if (!query || query.trim().length === 0) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        if (!['all', 'mine'].includes(filter)) {
            return res.status(400).json({ error: 'Invalid filter. Must be "all" or "mine"' });
        }

        const quizzes = await QuizRepository.searchForChallenge(query.trim(), userId, filter);

        res.json({ quizzes });
    } catch (err) {
        logger.error('Quiz search for challenge failed', {
            error: err,
            context: { query: req.query.query, userId: req.user.id },
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
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
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

// Get a specific quiz by ID
router.get('/:id', async (req, res) => {
    try {
        const quizId = req.params.id;
        const cacheKey = `quiz_details_v2_${quizId}`; // Changed key to invalidate old cache

        // Check cache first
        if (cache.has(cacheKey)) {
            return res.json(cache.get(cacheKey));
        }

        const quiz = await Quiz.getById(quizId);
        if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

        // Log the fetched quiz to verify creator and likes
        logger.debug('Fetched quiz details', {
            quizId,
            hasCreator: !!quiz.creator,
            creatorUsername: quiz.creator?.username,
            likesCount: quiz.likesCount,
            requestId: req.requestId
        });

        // Cache for 5 minutes
        cache.set(cacheKey, quiz, 5 * 60 * 1000);

        res.json(quiz);
    } catch (err) {
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

// Create a new quiz (POST /api/quizzes)
router.post('/', authenticateToken, requirePermission('quiz:create'), createQuizLimiter, async (req, res) => {
    try {
        const { title, category, difficulty, questions, is_public, source, video_url } = req.body;
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
        const { version } = req.body; // Extract version for optimistic locking

        // Verify ownership
        const quiz = await Quiz.getById(quizId);
        if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
        if (quiz.creator_id !== req.user.id) {
            return res.status(403).json({ error: 'You can only publish your own quizzes' });
        }

        await Quiz.updateStatus(quizId, 'pending_review', 0, version);
        res.json({ message: 'Quiz submitted for review' });
    } catch (err) {
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

// Review Quiz (Approve/Reject)
router.post('/:id/review', authenticateToken, async (req, res) => {
    try {
        const quizId = req.params.id;
        const { status, comments, version } = req.body; // status: 'approved' or 'rejected', version for optimistic locking

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const isPublic = status === 'approved' ? 1 : 0;
        await Quiz.updateStatus(quizId, status, isPublic, version);

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
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
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
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

// Generate Quiz with AI (Enhanced - returns data for review)
router.post('/generate', authenticateToken, async (req, res) => {
    try {
        const {
            topic,
            difficulty = 'medium',
            numQuestions = 10,
            focusAreas = '',
            keywords = '',
            questionTypes = ['multiple_choice', 'true_false'],
            additionalContext = ''
        } = req.body;

        if (!topic || topic.trim().length === 0) {
            return res.status(400).json({ error: 'Topic is required' });
        }

        // Validate numQuestions (5-50)
        const questionCount = Math.min(50, Math.max(5, parseInt(numQuestions) || 10));

        logger.info('AI quiz generation requested', {
            topic,
            difficulty,
            numQuestions: questionCount,
            focusAreas,
            keywords,
            questionTypes,
            userId: req.user.id,
            requestId: req.requestId
        });

        // Build enhanced context prompt for the AI
        let contextPrompt = `
            Generate a comprehensive quiz about the following topic: "${topic}".
            
            The quiz should cover key concepts, important facts, and relevant details about this topic.
            Ensure questions are educational, accurate, and appropriate for the specified difficulty level.
            
            Topic: ${topic}
            Difficulty: ${difficulty}
            Number of Questions: ${questionCount}
        `;

        // Add focus areas if provided
        if (focusAreas && focusAreas.trim()) {
            contextPrompt += `\n            Focus Areas (prioritize questions about these): ${focusAreas}`;
        }

        // Add keywords if provided
        if (keywords && keywords.trim()) {
            contextPrompt += `\n            Keywords (include questions featuring these terms): ${keywords}`;
        }

        // Add additional context if provided
        if (additionalContext && additionalContext.trim()) {
            contextPrompt += `\n            Additional Instructions: ${additionalContext}`;
        }

        // Also ask AI to suggest a category
        contextPrompt += `\n\n            IMPORTANT: Also suggest a single-word or short phrase category for this quiz that would help users find it (e.g., "Programming", "Science", "History", "Mathematics", etc.)`;

        // Generate questions using AI
        const config = {
            numQuestions: questionCount,
            difficulty: difficulty,
            questionTypes: Array.isArray(questionTypes) ? questionTypes : ['multiple_choice', 'true_false'],
            focusArea: focusAreas,
            keywords: keywords
        };

        const result = await aiQuizGenerator.generateQuiz(contextPrompt, config);

        // Handle both old format (array) and new format (object with questions and category)
        let questions = [];
        let suggestedCategory = topic.split(' ').slice(0, 2).join(' '); // Default: first 2 words of topic

        if (Array.isArray(result)) {
            questions = result;
        } else if (result && result.questions) {
            questions = result.questions;
            if (result.suggestedCategory) {
                suggestedCategory = result.suggestedCategory;
            }
        }

        if (!questions || questions.length === 0) {
            throw new Error('Failed to generate questions from topic');
        }

        logger.info('AI questions generated for review', {
            count: questions.length,
            topic,
            suggestedCategory,
            requestId: req.requestId
        });

        // Format questions for frontend
        const formattedQuestions = aiQuizGenerator.formatQuestionsForDB(questions);

        // Return quiz data for review (NOT saving to DB yet)
        res.status(200).json({
            title: `${topic} Quiz`,
            category: suggestedCategory,
            suggestedCategories: [suggestedCategory, 'AI Generated', topic.split(' ')[0]].filter((v, i, a) => a.indexOf(v) === i),
            difficulty,
            questions: formattedQuestions,
            source: 'ai',
            topic: topic
        });
    } catch (err) {
        logger.error('AI quiz generation failed', {
            error: err,
            context: { topic: req.body.topic, userId: req.user.id },
            requestId: req.requestId
        });
        res.status(500).json({ error: 'Failed to generate AI quiz: ' + err.message });
    }
});


// Save AI-generated quiz (after user review and edit)
router.post('/save-ai-quiz', authenticateToken, async (req, res) => {
    try {
        const { title, category, difficulty, questions } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Quiz title is required' });
        }

        if (!category || !category.trim()) {
            return res.status(400).json({ error: 'Quiz category is required' });
        }

        if (!questions || questions.length < 5) {
            return res.status(400).json({ error: 'Quiz must have at least 5 questions' });
        }

        logger.info('Saving AI-generated quiz', {
            title,
            category,
            difficulty,
            questionCount: questions.length,
            userId: req.user.id,
            requestId: req.requestId
        });

        // Create quiz in database
        const quiz = await Quiz.create(title.trim(), category.trim(), difficulty || 'medium', req.user.id, 'ai');

        // Add questions to quiz
        for (const question of questions) {
            await Quiz.addQuestion(quiz.id, question);
        }

        // Fetch complete quiz with questions
        const completeQuiz = await Quiz.getById(quiz.id);

        logger.info('AI quiz saved successfully', {
            quizId: quiz.id,
            title,
            questionCount: questions.length,
            userId: req.user.id,
            requestId: req.requestId
        });

        res.status(201).json(completeQuiz);
    } catch (err) {
        logger.error('Failed to save AI quiz', {
            error: err,
            context: { title: req.body.title, userId: req.user.id },
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
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

        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
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
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

// ============================================
// VIDEO QUIZ GENERATION ENDPOINTS
// ============================================

// Validate video URL
router.post('/video/validate', authenticateToken, async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'Video URL is required' });
        }

        logger.info('Validating video URL', {
            url,
            userId: req.user.id,
            requestId: req.requestId
        });

        const preview = await videoQuizService.validateVideoUrl(url);

        res.json(preview);
    } catch (err) {
        logger.error('Video URL validation failed', {
            error: err,
            context: { url: req.body.url, userId: req.user.id },
            requestId: req.requestId
        });

        // User errors should return 400, server errors 500
        const userErrorPatterns = [
            'Invalid YouTube URL',
            'Unsupported video platform',
            'only English videos are supported',
            'Playlist support'
        ];

        const isUserError = userErrorPatterns.some(pattern =>
            err.message.includes(pattern)
        );

        res.status(isUserError ? 400 : 500).json({ error: err.message });
    }
});

// Extract transcript from video
router.post('/video/extract-transcript', authenticateToken, async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'Video URL is required' });
        }

        logger.info('Extracting transcript from video', {
            url,
            userId: req.user.id,
            requestId: req.requestId
        });

        const transcript = await videoQuizService.extractTranscript(url);

        res.json({
            success: true,
            transcript: {
                fullText: transcript.fullText,
                wordCount: transcript.wordCount,
                segmentCount: transcript.segments.length,
                duration: transcript.duration
            }
        });
    } catch (err) {
        logger.error('Transcript extraction failed', {
            error: err,
            context: { url: req.body.url, userId: req.user.id },
            requestId: req.requestId
        });

        // User errors should return 400, server errors 500
        const userErrorPatterns = [
            'No transcript available',
            'Transcripts are disabled',
            'Invalid YouTube URL',
            'Playlist support'
        ];

        const isUserError = userErrorPatterns.some(pattern =>
            err.message.includes(pattern)
        );

        res.status(isUserError ? 400 : 500).json({ error: err.message });
    }
});

// Generate quiz from video
router.post('/video/generate', authenticateToken, async (req, res) => {
    try {
        const { url, config } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'Video URL is required' });
        }

        if (!config || !config.numQuestions) {
            return res.status(400).json({ error: 'Quiz configuration is required' });
        }

        logger.info('Generating quiz from video', {
            url,
            config,
            userId: req.user.id,
            requestId: req.requestId
        });

        const quizData = await videoQuizService.generateQuizFromVideo(
            url,
            config,
            req.user.id
        );

        // Return quiz data without saving to DB (user will verify first)
        res.status(200).json({
            title: quizData.title,
            category: quizData.category,
            difficulty: quizData.difficulty,
            questions: quizData.questions,
            source: quizData.source,
            videoUrl: quizData.videoUrl,
            videoPlatform: quizData.videoPlatform,
            videoId: quizData.videoId,
            videoTitle: quizData.videoTitle,
            videoDuration: quizData.videoDuration,
            videoThumbnail: quizData.videoThumbnail
        });
    } catch (err) {
        logger.error('Video quiz generation failed', {
            error: err,
            context: { url: req.body.url, config: req.body.config, userId: req.user.id },
            requestId: req.requestId
        });

        // Determine if this is a user error (400) or server error (500)
        const userErrorPatterns = [
            'No transcript available',
            'Transcripts are disabled',
            'Invalid YouTube URL',
            'Unsupported video platform',
            'only English videos are supported',
            'Playlist support is not yet implemented'
        ];

        const isUserError = userErrorPatterns.some(pattern =>
            err.message.includes(pattern)
        );

        const statusCode = isUserError ? 400 : 500;
        res.status(statusCode).json({ error: err.message });
    }

});

// Save video-generated quiz (after user confirms)
router.post('/save-video-quiz', authenticateToken, async (req, res) => {
    try {
        const {
            title,
            category,
            difficulty,
            questions,
            videoUrl,
            videoPlatform,
            videoId,
            videoTitle,
            videoDuration,
            videoThumbnail
        } = req.body;

        if (!title || !category || !questions || questions.length < 5) {
            return res.status(400).json({ error: 'Invalid quiz data. Minimum 5 questions required.' });
        }

        if (!videoUrl || !videoPlatform || !videoId) {
            return res.status(400).json({ error: 'Video metadata is required' });
        }

        logger.info('Saving video quiz', {
            title,
            category,
            questionCount: questions.length,
            videoUrl,
            userId: req.user.id,
            requestId: req.requestId
        });

        // Create quiz in database with video metadata
        const quiz = await Quiz.create(title, category, difficulty, req.user.id, 'video');

        // Update quiz with video metadata
        const db = require('../db');
        await new Promise((resolve, reject) => {
            db.run(
                `UPDATE quizzes 
                 SET video_url = ?, video_platform = ?, video_id = ?, 
                     video_title = ?, video_duration = ?, video_thumbnail = ?
                 WHERE id = ?`,
                [videoUrl, videoPlatform, videoId, videoTitle, videoDuration, videoThumbnail, quiz.id],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        // Add questions to quiz
        for (const question of questions) {
            await Quiz.addQuestion(quiz.id, question);
        }

        // Fetch complete quiz with questions
        const completeQuiz = await Quiz.getById(quiz.id);

        logger.info('Video quiz saved successfully', {
            quizId: quiz.id,
            title,
            userId: req.user.id,
            requestId: req.requestId
        });

        res.status(201).json(completeQuiz);
    } catch (err) {
        logger.error('Failed to save video quiz', {
            error: err,
            context: { title: req.body.title, userId: req.user.id },
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});


// Update quiz questions (for editing generated quizzes)
router.put('/:id/update-questions', authenticateToken, async (req, res) => {
    try {
        const quizId = req.params.id;
        const { questions, version } = req.body; // Extract version for optimistic locking

        // Verify ownership
        const quiz = await Quiz.getById(quizId);
        if (!quiz) {
            return res.status(404).json({ error: 'Quiz not found' });
        }
        if (quiz.creator_id !== req.user.id) {
            return res.status(403).json({ error: 'You can only update your own quizzes' });
        }

        const QuizRepository = require('../repositories/QuizRepository');

        // Update all questions with version check
        await QuizRepository.updateQuestions(quizId, questions, version);

        // Fetch updated quiz
        const updatedQuiz = await Quiz.getById(quizId);

        res.json(updatedQuiz);
    } catch (err) {
        logger.error('Failed to update quiz questions', {
            error: err,
            context: { quizId: req.params.id, userId: req.user.id },
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});


// Add a question to a quiz
router.post('/:id/questions', authenticateToken, validateQuestion, async (req, res) => {
    try {
        const quizId = req.params.id;
        const { version, ...questionData } = req.body; // Extract version separately from question data

        // Verify ownership
        const quiz = await Quiz.getById(quizId);
        if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
        if (quiz.creator_id !== req.user.id) {
            return res.status(403).json({ error: 'You can only add questions to your own quizzes' });
        }

        const questionId = await Quiz.addQuestion(quizId, questionData, version);

        // Invalidate cache for this quiz to ensure fresh data
        cache.delete(`quiz_details_v2_${quizId}`);

        res.status(201).json({ id: questionId });
    } catch (err) {
        logger.error('Failed to add question to quiz', {
            error: err,
            context: { quizId: req.params.id },
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

        // Invalidate cache for this quiz
        cache.delete(`quiz_details_v2_${question.quiz.id}`);

        res.json({ message: 'Question updated successfully' });
    } catch (err) {
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
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
        await QuestionAttempt.destroy({
            where: { question_id: questionId }
        });

        // Delete the question
        await question.destroy();

        // Invalidate cache for this quiz (use same key as GET endpoint)
        cache.delete(`quiz_details_v2_${question.quiz.id}`);

        res.json({ message: 'Question deleted successfully' });
    } catch (err) {
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});


// Get detailed quiz report
router.get('/results/:resultId/report', async (req, res) => {
    try {
        const report = await QuizResult.getQuizReport(req.params.resultId);
        if (!report) return res.status(404).json({ error: 'Report not found' });
        res.json(report);
    } catch (err) {
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
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
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

// Get all attempts for a quiz by a user
router.get('/:quizId/attempts/:userId', async (req, res) => {
    try {
        const attempts = await QuizResult.getUserQuizAttempts(req.params.quizId, req.params.userId);
        res.json(attempts);
    } catch (err) {
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

// Upload quizzes from JSON
router.post('/upload-json', authenticateToken, async (req, res) => {
    try {
        const { quizzes } = req.body;

        if (!quizzes || !Array.isArray(quizzes) || quizzes.length === 0) {
            return res.status(400).json({ error: 'Invalid request. Expected an array of quizzes.' });
        }

        logger.info('JSON quiz upload requested', {
            quizCount: quizzes.length,
            userId: req.user.id,
            requestId: req.requestId
        });

        // Validate each quiz
        const validationErrors = [];
        quizzes.forEach((quiz, idx) => {
            const errors = [];

            // Required fields
            if (!quiz.title || typeof quiz.title !== 'string' || quiz.title.trim().length === 0) {
                errors.push('Missing or invalid "title" field');
            }
            if (!quiz.category || typeof quiz.category !== 'string' || quiz.category.trim().length === 0) {
                errors.push('Missing or invalid "category" field');
            }
            if (!['Beginner', 'Intermediate', 'Advanced', 'Expert'].includes(quiz.difficulty)) {
                errors.push('Invalid "difficulty" - must be Beginner, Intermediate, Advanced, or Expert');
            }

            // Questions validation
            if (!Array.isArray(quiz.questions)) {
                errors.push('Missing or invalid "questions" array');
            } else {
                if (quiz.questions.length < 5) {
                    errors.push(`Quiz must have at least 5 questions (found ${quiz.questions.length})`);
                }
                if (quiz.questions.length > 20) {
                    errors.push(`Quiz must have at most 20 questions (found ${quiz.questions.length})`);
                }

                quiz.questions.forEach((q, qIdx) => {
                    if (!q.type || !['multiple_choice', 'true_false'].includes(q.type)) {
                        errors.push(`Question ${qIdx + 1}: Invalid type - must be "multiple_choice" or "true_false"`);
                    }
                    if (!q.text || typeof q.text !== 'string' || q.text.trim().length === 0) {
                        errors.push(`Question ${qIdx + 1}: Missing or invalid "text" field`);
                    }

                    if (q.type === 'multiple_choice') {
                        if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6) {
                            errors.push(`Question ${qIdx + 1}: Multiple choice must have 2-6 options`);
                        }
                        if (!q.correctAnswer || !q.options?.includes(q.correctAnswer)) {
                            errors.push(`Question ${qIdx + 1}: correctAnswer must exactly match one of the options`);
                        }
                    }

                    if (q.type === 'true_false') {
                        if (!['true', 'false'].includes(q.correctAnswer)) {
                            errors.push(`Question ${qIdx + 1}: True/False correctAnswer must be "true" or "false"`);
                        }
                    }

                    if (!q.correctAnswer) {
                        errors.push(`Question ${qIdx + 1}: Missing "correctAnswer" field`);
                    }
                });
            }

            if (errors.length > 0) {
                validationErrors.push({ quizIndex: idx + 1, title: quiz.title || 'Untitled', errors });
            }
        });

        if (validationErrors.length > 0) {
            logger.warn('JSON quiz upload validation failed', {
                validationErrors,
                userId: req.user.id,
                requestId: req.requestId
            });
            return res.status(400).json({
                error: 'Validation failed',
                details: validationErrors
            });
        }

        // Create quizzes in database
        const createdQuizzes = [];
        for (const quizData of quizzes) {
            try {
                // Create quiz
                const quiz = await Quiz.create(
                    quizData.title.trim(),
                    quizData.category.trim(),
                    quizData.difficulty,
                    req.user.id,
                    'json_upload'
                );

                // Add questions
                for (const questionData of quizData.questions) {
                    const question = {
                        type: questionData.type,
                        text: questionData.text,
                        correctAnswer: questionData.correctAnswer
                    };

                    if (questionData.type === 'multiple_choice') {
                        question.options = questionData.options;
                    }

                    await Quiz.addQuestion(quiz.id, question);
                }

                createdQuizzes.push({
                    id: quiz.id,
                    title: quizData.title,
                    questionCount: quizData.questions.length
                });

                logger.info('Quiz created from JSON upload', {
                    quizId: quiz.id,
                    title: quizData.title,
                    questionCount: quizData.questions.length,
                    userId: req.user.id,
                    requestId: req.requestId
                });
            } catch (err) {
                logger.error('Failed to create quiz from JSON', {
                    error: err,
                    quizTitle: quizData.title,
                    userId: req.user.id,
                    requestId: req.requestId
                });
                throw new Error(`Failed to create quiz "${quizData.title}": ${err.message}`);
            }
        }

        logger.info('JSON quiz upload completed', {
            count: createdQuizzes.length,
            userId: req.user.id,
            requestId: req.requestId
        });

        res.status(201).json({
            message: 'Quizzes created successfully',
            count: createdQuizzes.length,
            quizzes: createdQuizzes
        });
    } catch (err) {
        logger.error('JSON quiz upload failed', {
            error: err,
            userId: req.user.id,
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

module.exports = router;
