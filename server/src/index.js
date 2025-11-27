require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

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
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

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
