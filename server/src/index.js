require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const quizRoutes = require('./routes/quiz');
const gameManager = require('./managers/GameManager');
const Quiz = require('./models/Quiz');

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

// Socket.io Logic
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_game', ({ userId, quizId }) => {
        gameManager.startSession(socket.id, userId, quizId);
        socket.join(`quiz_${quizId} `);
        console.log(`User ${userId} joined quiz ${quizId} `);
    });

    socket.on('submit_answer', async ({ quizId, questionId, answer }) => {
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

        socket.emit('answer_result', { correct: isCorrect, correctAnswer: question.correctAnswer });
    });

    socket.on('save_result', ({ quizId, score }) => {
        const session = gameManager.getSession(socket.id);
        if (!session) return;

        const db = require('./db');
        db.run(
            'INSERT INTO results (user_id, quiz_id, score) VALUES (?, ?, ?)',
            [session.userId, quizId, score],
            (err) => {
                if (err) console.error('Error saving result:', err);
                else console.log(`Saved score ${score} for user ${session.userId} on quiz ${quizId} `);
            }
        );
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
