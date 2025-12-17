require('dotenv').config();
const express = require('express');
const http = require('http');
const compression = require('compression');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const logger = require('./utils/logger');
const requestLogger = require('./middleware/requestLogger');
const cache = require('./utils/cache');
const { apiLimiter } = require('./middleware/rateLimiter');
const { httpsRedirect, securityLogger, validateProductionSecurity } = require('./middleware/securityMiddleware');

// Initialize Sequelize models
const { sequelize } = require('./models/sequelize');

const authRoutes = require('./routes/auth');
const quizRoutes = require('./routes/quiz');
const adminRoutes = require('./routes/admin');
const gameManager = require('./managers/GameManager');
const Quiz = require('./models/Quiz');
const QuizResult = require('./models/QuizResult');

const app = express();
// Trust the first proxy (Railway load balancer)
app.set('trust proxy', 1);
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

// Validate production security configuration
validateProductionSecurity();

// HTTPS redirect middleware (production only)
app.use(httpsRedirect);

// Security event logging
app.use(securityLogger);

// Security headers with helmet
app.use(helmet({
    // Content Security Policy
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "data:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
            upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
            blockAllMixedContent: process.env.NODE_ENV === 'production' ? [] : null,
        },
    },
    // HTTP Strict Transport Security
    hsts: process.env.NODE_ENV === 'production' ? {
        maxAge: 31536000, // 1 year in seconds
        includeSubDomains: true,
        preload: true
    } : false,
    // X-Frame-Options: Prevent clickjacking
    frameguard: {
        action: 'deny'  // or 'sameorigin' if you need to embed in iframes
    },
    // X-Content-Type-Options: Prevent MIME type sniffing
    noSniff: true,
    // Referrer-Policy: Control referrer information
    referrerPolicy: {
        policy: 'strict-origin-when-cross-origin'
    },
    // Permissions-Policy: Control browser features
    permissionsPolicy: {
        features: {
            geolocation: ["'none'"],
            microphone: ["'none'"],
            camera: ["'none'"],
            payment: ["'none'"],
            usb: ["'none'"],
            magnetometer: ["'none'"],
            gyroscope: ["'none'"],
            accelerometer: ["'none'"]
        }
    },
    // X-DNS-Prefetch-Control
    dnsPrefetchControl: {
        allow: false
    },
    // X-Download-Options for IE8+
    ieNoOpen: true,
    // X-Permitted-Cross-Domain-Policies
    crossOriginEmbedderPolicy: false, // Allow embedding for development
    // Hide X-Powered-By header
    hidePoweredBy: true
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

// Cookie parser middleware
app.use(cookieParser());

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
app.use('/api/library', require('./routes/library'));
app.use('/api/challenges', require('./routes/challenges'));
app.use('/api/group-challenges', require('./routes/groupChallenges'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/achievements', require('./routes/achievements'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/legal', require('./routes/legal'));
app.use('/api/social', require('./routes/social'));
app.use('/api/usage', require('./routes/usage')); // NEW: Usage tracking
app.use('/api/subscription', require('./routes/subscription')); // NEW: Subscription management
app.use('/api/quiz-sessions', require('./routes/quizSession')); // NEW: Quiz session management
app.use('/api/comments', require('./routes/comments')); // NEW: Quiz comments and reviews
app.use('/api/admin', adminRoutes); // Registered admin routes
app.use('/api/public', require('./routes/public')); // Public endpoints (no auth required)

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

    socket.on('join_user_room', ({ userId }) => {
        socket.join(`user_${userId}`);
        logger.info('User joined notification room', { userId, socketId: socket.id });
    });

    socket.on('join_game', ({ userId, quizId }) => {
        gameManager.startSession(socket.id, userId, quizId);
        socket.join(`quiz_${quizId}`);
        logger.info('User joined quiz game', { userId, quizId, socketId: socket.id });
    });


    socket.on('submit_answer', async ({ quizId, questionId, answer, timeTaken }) => {
        const session = gameManager.getSession(socket.id);
        if (!session) {
            // If session missing, try to restore or log error
            logger.warn('Session missing for submit_answer', { socketId: socket.id, quizId });
            return;
        }

        // Validate answer
        const quiz = await Quiz.getById(quizId);
        if (!quiz) {
            logger.error('Quiz not found during submit_answer', { quizId });
            return;
        }

        // Ensure IDs are comparable (both strings or both numbers)
        const question = quiz.questions.find(q => String(q.id) === String(questionId));

        let isCorrect = false;
        let correctAnswer = null;

        if (question) {
            isCorrect = question.validateAnswer(answer);
            correctAnswer = question.correctAnswer;
        } else {
            logger.error('Question not found during submit_answer', { quizId, questionId });
            // Should probably error out, but safe fallback avoids crash
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

        socket.emit('answer_result', { correct: isCorrect, correctAnswer: correctAnswer });
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

    // Group Challenge Socket.IO Events
    const GroupChallengeRepository = require('./repositories/GroupChallengeRepository');
    const GroupChallengeService = require('./services/groupChallengeService');
    const Quiz = require('./models/Quiz');

    // Track auto-end timers for rooms
    const autoEndTimers = new Map(); // roomId -> timeoutId

    socket.on('join_group_challenge_room', async ({ userId, roomId, username }) => {
        try {
            const roomKey = `group_challenge_${roomId}`;
            await socket.join(roomKey);

            logger.info('User joined group challenge room', {
                userId,
                roomId,
                socketId: socket.id
            });

            // Get updated room details
            const room = await GroupChallengeRepository.getRoomById(roomId);

            // Broadcast to all participants including sender
            io.to(roomKey).emit('room_updated', {
                participants: room.participants,
                participantCount: room.participant_count
            });

            logger.info('Room details broadcasted', { roomId, participantCount: room.participant_count });
        } catch (err) {
            logger.error('Failed to join group challenge room', {
                error: err,
                userId,
                roomId
            });
        }
    });

    socket.on('leave_group_challenge_room', async ({ userId, roomId }) => {
        try {
            const roomKey = `group_challenge_${roomId}`;
            await socket.leave(roomKey);

            logger.info('User left group challenge room', { userId, roomId });
        } catch (err) {
            logger.error('Failed to leave group challenge room', { error: err, userId, roomId });
        }
    });

    // Group challenge: join room (via API, broadcast via socket)
    socket.on('group_challenge_participant_joined', async ({ roomId, participant }) => {
        try {
            const roomKey = `group_challenge_${roomId}`;

            // Broadcast to all participants in the room
            io.to(roomKey).emit('participant_joined', {
                participant,
                participantCount: participant.participant_count
            });

            logger.info('Participant joined broadcasted', { roomId, userId: participant.user_id });
        } catch (err) {
            logger.error('Failed to broadcast participant joined', { error: err, roomId });
        }
    });

    // Group challenge: submit answer
    socket.on('group_challenge_submit_answer', async ({ roomId, questionId, answer, timeTaken, currentQuestionIndex, userId }) => {
        try {
            // Get quiz to validate answer
            const room = await GroupChallengeRepository.getRoomById(roomId);
            const quiz = await Quiz.getById(room.quiz_id);
            const question = quiz.questions.find(q => q.id === questionId);

            if (!question) {
                return socket.emit('error', { message: 'Question not found' });
            }

            // Check if answer is correct
            const isCorrect = question.correctAnswer === answer;
            let points = 0;

            if (isCorrect) {
                // Flat +10 points for correct answer
                points = 10;
            }

            // Update participant score using atomic increment (prevents race conditions)
            // Pass the increment values, not absolute values
            await GroupChallengeRepository.updateParticipantScore(roomId, userId, points, timeTaken);

            // Get updated leaderboard
            const leaderboard = await GroupChallengeService.getLiveLeaderboard(roomId);

            // Broadcast leaderboard update to all participants
            io.to(`group_challenge_${roomId}`).emit('leaderboard_update', {
                leaderboard
            });

            // Send result to the player who answered
            socket.emit('group_challenge_answer_result', {
                questionId,
                isCorrect,
                correctAnswer: question.correctAnswer,
                points,
                currentQuestionIndex
            });

            logger.debug('Group challenge answer processed', {
                roomId,
                userId,
                questionId,
                isCorrect,
                points
            });
        } catch (err) {
            logger.error('Failed to process group challenge answer', {
                error: err,
                roomId,
                questionId
            });
        }
    });

    // Group challenge: player completed quiz
    socket.on('group_challenge_player_complete', async ({ roomId, userId, finalScore, totalTime }) => {
        try {
            logger.info('Player completed group challenge', { roomId, userId, finalScore, totalTime });

            // Mark player as complete
            await GroupChallengeRepository.markParticipantComplete(roomId, userId, finalScore, totalTime);

            // Get updated room state
            const room = await GroupChallengeRepository.getRoomById(roomId);
            const completedCount = room.participants.filter(p => p.completed).length;
            const totalParticipants = room.participants.length; // Only count actual participants, not max capacity

            logger.info('Group challenge completion status', {
                roomId,
                completedCount,
                totalParticipants,
                userId
            });

            // Broadcast completion to room
            io.to(`group_challenge_${roomId}`).emit('participant_completed', {
                userId,
                username: room.participants.find(p => p.user_id === userId)?.username,
                completedCount,
                totalParticipants
            });

            // Check if this is the first player to complete
            if (completedCount === 1 && totalParticipants > 1) {
                // Start auto-end timer (15 seconds)
                logger.info('Starting auto-end timer for remaining players', { roomId, timeRemaining: 15 });

                io.to(`group_challenge_${roomId}`).emit('auto_end_timer_started', {
                    timeRemaining: 15
                });

                // Set timeout to force complete after 15 seconds
                const timerId = setTimeout(async () => {
                    try {
                        logger.info('Auto-end timer expired, force completing challenge', { roomId });

                        // Check if challenge is still active
                        const currentRoom = await GroupChallengeRepository.getRoomById(roomId);
                        if (currentRoom && currentRoom.status === 'active') {
                            const result = await GroupChallengeService.forceCompleteChallenge(roomId);

                            io.to(`group_challenge_${roomId}`).emit('group_challenge_finished', {
                                participants: result.participants,
                                winner: result.winner
                            });
                        }

                        // Clean up timer
                        autoEndTimers.delete(roomId);
                    } catch (err) {
                        logger.error('Failed to force complete challenge', { error: err, roomId });
                    }
                }, 15000); // 15 seconds

                // Store timer so we can cancel it if all players finish early
                autoEndTimers.set(roomId, timerId);
            }
            // Check if all players have completed
            else if (completedCount === totalParticipants) {
                logger.info('All players completed, finishing challenge immediately', { roomId });

                // Cancel auto-end timer if it exists
                if (autoEndTimers.has(roomId)) {
                    clearTimeout(autoEndTimers.get(roomId));
                    autoEndTimers.delete(roomId);
                    logger.info('Cancelled auto-end timer - all players finished', { roomId });
                }

                // Complete the challenge
                const result = await GroupChallengeService.processChallengeCompletion(roomId);

                if (result.completed) {
                    io.to(`group_challenge_${roomId}`).emit('group_challenge_finished', {
                        participants: result.participants,
                        winner: result.winner
                    });
                }
            }
        } catch (err) {
            logger.error('Failed to process player completion', {
                error: err,
                roomId,
                userId
            });
        }
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
