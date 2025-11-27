require('dotenv').config();
const express = require('express');
const http = require('http');
const compression = require('compression');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
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
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5173",
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

// CORS configuration
const allowedOrigins = process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(',')
    : ["http://localhost:5173"];

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

// Performance and security monitoring middleware
app.use((req, res, next) => {
    const start = Date.now();

    // Log suspicious activities
    const suspiciousPatterns = [
        /(\%27)|(\')|(\-\-)|(\%23)|(#)/i, // SQL injection attempts
        /(<script|javascript:|onerror=)/i, // XSS attempts
        /(\.\.\/|\.\.\\)/i, // Path traversal attempts
    ];

    const fullUrl = req.originalUrl;
    const body = JSON.stringify(req.body);

    for (const pattern of suspiciousPatterns) {
        if (pattern.test(fullUrl) || pattern.test(body)) {
            console.warn(`🚨 Suspicious request detected from ${req.ip}: ${req.method} ${fullUrl}`);
            break;
        }
    }

    res.on('finish', () => {
        const duration = Date.now() - start;
        if (duration > 100) {
            console.warn(`⚠️  Slow request: ${req.method} ${req.path} - ${duration}ms`);
        }
    });
    next();
});

app.use('/api/auth', authRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/results', require('./routes/results'));
app.use('/api/profile', require('./routes/profile'));

// Socket.io Logic
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_game', ({ userId, quizId }) => {
        gameManager.startSession(socket.id, userId, quizId);
        socket.join(`quiz_${quizId} `);
        console.log(`User ${userId} joined quiz ${quizId} `);
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
            console.error('Error saving question attempt:', err);
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

            console.log(`Quiz ${quizId}: Score ${score}/${maxScore} (${actualPercentage}%) - Total Questions: ${totalQuestions}`);

            // Save result
            const result = await Result.create({
                user_id: session.userId,
                quiz_id: quizId,
                score,
            });

            const resultId = result.id;
            console.log(`Saved score ${score} for user ${session.userId} on quiz ${quizId}`);

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
            console.error('Error saving result:', err);
            socket.emit('result_saved', { success: false });
        }
    });

    socket.on('disconnect', () => {
        gameManager.endSession(socket.id);
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT} `);
});
