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
const adminRoutes = require('./routes/admin');
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
app.use('/api/social', require('./routes/social'));
app.use('/api/challenges', require('./routes/challenges'));
app.use('/api/usage', require('./routes/usage')); // NEW: Usage tracking
app.use('/api/subscription', require('./routes/subscription')); // NEW: Subscription management
app.use('/api/admin', adminRoutes); // Registered admin routes

// Make io available to routes
app.set('io', io);


// Socket.io Logic
// Track players in each challenge room
const challengeRooms = new Map(); // challengeId -> Set of userIds
// Track socket to user/challenge mapping for cleanup
const socketMap = new Map(); // socketId -> { userId, challengeId }

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

    // Challenge Socket.IO Events
    const ChallengeRepository = require('./repositories/ChallengeRepository');
    const ChallengeService = require('./services/challengeService');

    socket.on('join_challenge', async ({ userId, challengeId, username }) => {
        try {
            const roomId = `challenge_${challengeId}`;
            await socket.join(roomId);

            // Normalize challengeId to string for consistent Map keys
            const challengeKey = String(challengeId);

            // Track this player in the challenge room
            if (!challengeRooms.has(challengeKey)) {
                challengeRooms.set(challengeKey, new Set());
            }
            challengeRooms.get(challengeKey).add(userId);

            // Map socket to user for cleanup
            socketMap.set(socket.id, { userId, challengeId: challengeKey });

            const playersInRoom = challengeRooms.get(challengeKey);
            logger.info('User joined challenge', {
                userId,
                challengeId: challengeKey,
                socketId: socket.id,
                playerCount: playersInRoom.size,
                players: Array.from(playersInRoom)
            });

            // Notify opponent that player joined (in the room)
            socket.to(roomId).emit('opponent_joined', { userId, username });

            // ALSO Notify globally so ChallengeHub sees it (for the opponent waiting in the hub)
            // We need to know who the opponent is to filter on client side, or just send challengeId
            // and let client check if they are part of it.
            // Better: Fetch challenge to know participants
            const challenge = await ChallengeRepository.getChallengeById(challengeId);
            if (challenge) {
                const opponentId = challenge.creator_id === userId ? challenge.opponent_id : challenge.creator_id;
                io.emit('opponent_joined_lobby', {
                    challengeId,
                    joinedUserId: userId,
                    joinedUsername: username,
                    targetUserId: opponentId
                });
            }

            // Check if both players have joined
            if (playersInRoom.size >= 2) {
                logger.info('Both players ready, starting countdown', { challengeId: challengeKey });

                // Emit to the room immediately to ensure both players get it
                io.to(roomId).emit('both_players_ready');

                // Start the game after 3 seconds
                setTimeout(() => {
                    io.to(roomId).emit('challenge_start');
                    logger.info('Emitted challenge_start to room', { roomId, challengeId: challengeKey });
                }, 3000);
            } else {
                // Tell the user they are waiting
                socket.emit('waiting_for_opponent');
            }
        } catch (err) {
            logger.error('Failed to join challenge', { error: err, userId, challengeId });
        }
    });

    const handleLeave = (socketId) => {
        if (socketMap.has(socketId)) {
            const { userId, challengeId } = socketMap.get(socketId);

            // Remove from challenge room
            if (challengeRooms.has(challengeId)) {
                const room = challengeRooms.get(challengeId);
                room.delete(userId);
                if (room.size === 0) {
                    challengeRooms.delete(challengeId);
                } else {
                    // Notify remaining player
                    const roomId = `challenge_${challengeId}`;
                    io.to(roomId).emit('opponent_left', { userId });
                    logger.info('Notified room about user leaving', { roomId, userId });
                }
            }

            socketMap.delete(socketId);
            logger.info('Cleaned up user from challenge', { userId, challengeId, socketId });
        }
    };

    socket.on('challenge_submit_answer', async ({ challengeId, questionId, answer, timeTaken, currentQuestionIndex, userId }) => {
        try {
            // Get challenge details
            const challenge = await ChallengeRepository.getChallengeById(challengeId);
            if (!challenge) return;

            // Validate answer
            const quiz = await Quiz.getById(challenge.quiz_id);
            const question = quiz.questions.find(q => q.id === questionId);

            let isCorrect = false;
            if (question) {
                isCorrect = question.validateAnswer(answer);
            }

            // Get current participant score
            const participants = await ChallengeRepository.getChallengeParticipants(challengeId);
            const participant = participants.find(p => p.user_id === userId);
            const newScore = (participant?.score || 0) + (isCorrect ? 10 : 0);

            // Update participant score
            await ChallengeRepository.updateParticipantScore(
                challengeId,
                userId,
                newScore,
                (participant?.total_time_seconds || 0) + (timeTaken || 0)
            );

            // Broadcast progress to opponent
            io.to(`challenge_${challengeId}`).emit('opponent_progress', {
                userId,
                currentQuestion: currentQuestionIndex,
                score: newScore,
                isCorrect
            });

            // Send answer result to player
            socket.emit('challenge_answer_result', {
                correct: isCorrect,
                correctAnswer: question.correctAnswer,
                newScore
            });

            logger.debug('Challenge answer submitted', {
                challengeId,
                userId,
                questionId,
                isCorrect,
                newScore
            });
        } catch (err) {
            logger.error('Failed to process challenge answer', {
                error: err,
                challengeId,
                questionId
            });
        }
    });

    socket.on('challenge_complete', async ({ challengeId, userId, finalScore, totalTime }) => {
        try {
            // Update participant as completed
            await ChallengeRepository.markParticipantCompleted(challengeId, userId);

            // Update final score and time (no resultId since challenges don't create regular results)
            await ChallengeRepository.updateParticipantScore(
                challengeId,
                userId,
                finalScore,
                totalTime,
                null // resultId is null for challenges
            );

            logger.info('User completed challenge', {
                challengeId,
                userId,
                finalScore,
                totalTime
            });

            // Notify opponent that player finished
            socket.to(`challenge_${challengeId}`).emit('opponent_finished', {
                userId,
                score: finalScore,
                time: totalTime
            });

            // Check if both players completed
            const completionResult = await ChallengeService.processChallengeCompletion(challengeId);

            if (completionResult.completed) {
                // Both players finished - broadcast final results
                io.to(`challenge_${challengeId}`).emit('challenge_finished', {
                    winnerId: completionResult.winnerId,
                    result: completionResult.result,
                    participants: completionResult.participants
                });

                logger.info('Challenge completed', {
                    challengeId,
                    winnerId: completionResult.winnerId,
                    result: completionResult.result
                });
            } else {
                // Only one player finished - set a timeout to auto-end for opponent
                // Give opponent 15 seconds to finish, then force end
                setTimeout(async () => {
                    try {
                        const recheckResult = await ChallengeService.processChallengeCompletion(challengeId);
                        if (!recheckResult.completed) {
                            // Opponent still hasn't finished - force end
                            logger.info('Force ending challenge due to timeout', { challengeId });

                            // Notify opponent to force end
                            io.to(`challenge_${challengeId}`).emit('force_challenge_end', {
                                reason: 'opponent_finished_timeout',
                                message: 'Your opponent has finished. Quiz will end now.'
                            });
                        }
                    } catch (err) {
                        logger.error('Failed to force end challenge', { error: err, challengeId });
                    }
                }, 15000); // 15 seconds
            }
        } catch (err) {
            logger.error('Failed to process challenge completion', {
                error: err,
                challengeId,
                userId
            });
        }
    });

    socket.on('leave_challenge', ({ challengeId }) => {
        socket.leave(`challenge_${challengeId}`);
        logger.info('User left challenge', { challengeId, socketId: socket.id });
    });

    socket.on('disconnect', () => {
        handleLeave(socket.id);
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
