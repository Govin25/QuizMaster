require('dotenv').config();
const express = require('express');
const http = require('http');
const compression = require('compression');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const logger = require('./utils/logger');
const requestLogger = require('./middleware/requestLogger');
const cache = require('./utils/cache');
const { apiLimiter } = require('./middleware/rateLimiter');

// Initialize Sequelize models
const { sequelize } = require('./models/sequelize');

const authRoutes = require('./routes/auth');
const quizRoutes = require('./routes/quiz');
const gameManager = require('./managers/GameManager');
const Quiz = require('./models/Quiz');
const QuizResult = require('./models/QuizResult');

const app = express();
const server = http.createServer(app);

// CORS configuration
const allowedOrigins = process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(',')
    : ["http://localhost:5173", "http://localhost:5174"];


const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Security headers with helmet
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    crossOriginEmbedderPolicy: false, // Allow embedding for development
}));


app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));

// Request size limits to prevent DoS
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging and tracking middleware
app.use(requestLogger);

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

// Optimized compression middleware
app.use(compression({
    level: 6, // Balance between speed and compression ratio
    threshold: 1024, // Only compress responses > 1KB
    filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
    }
}));

app.use('/api/auth', authRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/results', require('./routes/results'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/legal', require('./routes/legal'));

// Socket.io Logic
io.on('connection', (socket) => {
    logger.info('WebSocket connection established', { socketId: socket.id });

    socket.on('join_game', ({ userId, quizId }) => {
        gameManager.startSession(socket.id, userId, quizId);
        socket.join(`quiz_${quizId} `);
        logger.info('User joined quiz game', { userId, quizId, socketId: socket.id });
    });

    socket.on('submit_answer', async ({ quizId, questionId, answer, timeTaken }) => {
        const session = gameManager.getSession(socket.id);
        if (!session) return;

        // Validate answer
        const quiz = await Quiz.getById(quizId);
        const question = quiz.questions.find(q => q.id === questionId);

        let isCorrect = false;
        if (question) {
            isCorrect = question.validateAnswer(answer);
        }

        if (isCorrect) {
            const newScore = gameManager.updateScore(socket.id, 10); // 10 points per correct answer
            socket.emit('score_update', { score: newScore });
        }

        // Save question attempt to database
        try {
            await QuizResult.saveQuestionAttempt({
                userId: session.userId,
                quizId: quizId,
                questionId: questionId,
                resultId: session.resultId || null, // Will be updated when result is saved
                userAnswer: answer,
                isCorrect: isCorrect,
                timeTakenSeconds: timeTaken || 0
            });
        } catch (err) {
            logger.error('Failed to save question attempt', {
                error: err,
                context: { userId: session.userId, quizId, questionId }
            });
        }

        socket.emit('answer_result', { correct: isCorrect, correctAnswer: question.correctAnswer });
    });

    socket.on('save_result', async ({ quizId, score, timeTaken }) => {
        const session = gameManager.getSession(socket.id);
        if (!session) return;

        const { Question, Result, QuestionAttempt } = require('./models/sequelize');
        const analyticsService = require('./services/analyticsService');
        const achievementService = require('./services/achievementService');

        try {
            // Get total questions in quiz
            const totalQuestions = await Question.count({ where: { quiz_id: quizId } });
            const maxScore = totalQuestions * 10;
            const actualPercentage = totalQuestions > 0 ? Math.round((score / maxScore) * 100) : 0;

            logger.debug('Quiz completion calculated', {
                quizId,
                userId: session.userId,
                score,
                maxScore,
                percentage: actualPercentage,
                totalQuestions
            });

            // Save result
            const result = await Result.create({
                user_id: session.userId,
                quiz_id: quizId,
                score,
            });

            const resultId = result.id;
            logger.info('Quiz result saved', {
                resultId,
                userId: session.userId,
                quizId,
                score,
                percentage: actualPercentage
            });

            // Update all question attempts with the result_id
            await QuestionAttempt.update(
                { result_id: resultId },
                {
                    where: {
                        user_id: session.userId,
                        quiz_id: quizId,
                        result_id: null,
                    }
                }
            );

            // Update user stats
            await analyticsService.updateStreak(session.userId);
            await analyticsService.updateUserStats(session.userId, actualPercentage, timeTaken || 0);

            // Check for new achievements
            const newAchievements = await achievementService.checkAndAwardAchievements(session.userId);

            // Invalidate relevant caches
            cache.delete(`library_${session.userId}`);
            cache.delete(`profile_stats_${session.userId}`);
            cache.deletePattern('leaderboard_*');

            socket.emit('result_saved', {
                success: true,
                resultId,
                newAchievements: newAchievements.map(a => ({
                    id: a.id,
                    name: a.name,
                    description: a.description,
                    icon: a.icon
                }))
            });
        } catch (err) {
            logger.error('Failed to save quiz result', {
                error: err,
                context: { userId: session.userId, quizId, score }
            });
            socket.emit('result_saved', { success: false });
        }
    });

    socket.on('disconnect', () => {
        gameManager.endSession(socket.id);
        logger.info('WebSocket connection closed', { socketId: socket.id });
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    logger.info('Server started successfully', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        logLevel: process.env.LOG_LEVEL || 'default'
    });
});
