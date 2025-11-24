import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import API_URL from '../config';
import { useAuth } from '../context/AuthContext';

const QuizGame = ({ quizId, onEndGame }) => {
    const { user } = useAuth();
    const [socket, setSocket] = useState(null);
    const [quiz, setQuiz] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(30); // 30 seconds per question
    const [gameOver, setGameOver] = useState(false);
    const [feedback, setFeedback] = useState(null); // { correct: boolean, correctAnswer: string }

    const scoreRef = useRef(score);
    const socketRef = useRef(socket);

    useEffect(() => {
        scoreRef.current = score;
    }, [score]);

    useEffect(() => {
        socketRef.current = socket;
    }, [socket]);

    useEffect(() => {
        // Fetch quiz details first
        fetch(`${API_URL}/api/quizzes/${quizId}`)
            .then(res => res.json())
            .then(data => setQuiz(data));
    }, [quizId]);

    useEffect(() => {
        if (!quiz) return;

        // Connect socket
        const newSocket = io(API_URL);
        setSocket(newSocket);

        newSocket.emit('join_game', { userId: user.id, quizId });

        newSocket.on('score_update', ({ score }) => {
            setScore(score);
        });

        newSocket.on('answer_result', (result) => {
            setFeedback(result);
            setTimeout(() => {
                setFeedback(null);
                handleNextQuestion();
            }, 2000);
        });

        return () => newSocket.close();
    }, [quiz, quizId, user.id]);

    useEffect(() => {
        if (timeLeft > 0 && !gameOver && !feedback) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        } else if (timeLeft === 0 && !gameOver && !feedback) {
            handleNextQuestion();
        }
    }, [timeLeft, gameOver, feedback]);

    useEffect(() => {
        if (gameOver && socketRef.current) {
            socketRef.current.emit('save_result', {
                quizId,
                score: scoreRef.current
            });
        }
    }, [gameOver, quizId]);

    const handleNextQuestion = () => {
        setTimeLeft(30);
        setCurrentQuestionIndex(prev => {
            if (prev + 1 >= (quiz?.questions?.length || 0)) {
                setGameOver(true);
                return prev;
            }
            return prev + 1;
        });
    };

    const submitAnswer = (answer) => {
        if (feedback) return; // Prevent double submission
        const question = quiz.questions[currentQuestionIndex];
        socket.emit('submit_answer', {
            quizId,
            questionId: question.id,
            answer
        });
    };

    if (!quiz) return <div>Loading Game...</div>;

    if (gameOver) {
        return (
            <div className="glass-card">
                <h2>Quiz Completed!</h2>
                <div style={{ fontSize: '4rem', fontWeight: 'bold', color: 'var(--primary)', margin: '1rem 0' }}>
                    {score} <span style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>/ {quiz.questions.length * 10}</span>
                </div>
                <div className="grid" style={{ marginBottom: '2rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Correct Answers</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{score / 10} / {quiz.questions.length}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Accuracy</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{Math.round((score / (quiz.questions.length * 10)) * 100)}%</div>
                    </div>
                </div>
                <button onClick={onEndGame}>Back to Menu</button>
            </div>
        );
    }

    const currentQuestion = quiz.questions[currentQuestionIndex];

    return (
        <div className="glass-card" style={{ maxWidth: '800px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span>Score: {score}</span>
                <span>Time: {timeLeft}s</span>
            </div>

            <h3>Question {currentQuestionIndex + 1} of {quiz.questions.length}</h3>
            <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>{currentQuestion.text}</p>

            {feedback && (
                <div style={{
                    padding: '1rem',
                    marginBottom: '1rem',
                    borderRadius: '8px',
                    background: feedback.correct ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    border: `1px solid ${feedback.correct ? '#22c55e' : '#ef4444'}`
                }}>
                    {feedback.correct ? 'Correct!' : `Wrong! The answer was ${feedback.correctAnswer}`}
                </div>
            )}

            <div className="grid">
                {currentQuestion.type === 'multiple_choice' ? (
                    currentQuestion.options.map((option, idx) => (
                        <button key={idx} onClick={() => submitAnswer(option)} disabled={!!feedback}>
                            {option}
                        </button>
                    ))
                ) : (
                    <>
                        <button onClick={() => submitAnswer('true')} disabled={!!feedback}>True</button>
                        <button onClick={() => submitAnswer('false')} disabled={!!feedback}>False</button>
                    </>
                )}
            </div>
        </div>
    );
};

export default QuizGame;
