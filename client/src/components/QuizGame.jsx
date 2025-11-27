import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import API_URL from '../config';
import { useAuth } from '../context/AuthContext';

const QuizGame = ({ quizId, onEndGame, onShowReport }) => {
    const { user } = useAuth();
    const [socket, setSocket] = useState(null);
    const [quiz, setQuiz] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(30); // 30 seconds per question
    const [gameOver, setGameOver] = useState(false);
    const [feedback, setFeedback] = useState(null); // { correct: boolean, correctAnswer: string }
    const [questionStartTime, setQuestionStartTime] = useState(Date.now());
    const [quizStartTime] = useState(Date.now());
    const [resultId, setResultId] = useState(null);
    const [showEndConfirm, setShowEndConfirm] = useState(false);
    const [newAchievements, setNewAchievements] = useState([]);

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

        newSocket.on('result_saved', ({ success, resultId, newAchievements }) => {
            console.log('Received result_saved event:', { success, resultId, newAchievements });
            if (success) {
                setResultId(resultId);
                if (newAchievements && newAchievements.length > 0) {
                    setNewAchievements(newAchievements);
                }
            }
        });

        return () => newSocket.close();
    }, [quiz, quizId, user.id]);

    // Reset question start time when question changes
    useEffect(() => {
        setQuestionStartTime(Date.now());
    }, [currentQuestionIndex]);

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
            const totalTime = Math.floor((Date.now() - quizStartTime) / 1000); // Total quiz time in seconds
            socketRef.current.emit('save_result', {
                quizId,
                score: scoreRef.current,
                timeTaken: totalTime
            });
        }
    }, [gameOver, quizId, quizStartTime]);

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
        const timeTaken = Math.floor((Date.now() - questionStartTime) / 1000); // Convert to seconds

        socket.emit('submit_answer', {
            quizId,
            questionId: question.id,
            answer,
            timeTaken
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
                {resultId ? (
                    <button onClick={() => onShowReport(resultId)} style={{ marginBottom: '1rem' }}>
                        View Detailed Report
                    </button>
                ) : (
                    <div style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                        Saving results...
                    </div>
                )}
                <button onClick={onEndGame}>Back to Menu</button>

                {/* Achievement Notifications */}
                {newAchievements.length > 0 && (
                    <div style={{
                        marginTop: '2rem',
                        padding: '1.5rem',
                        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1))',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        borderRadius: '12px'
                    }}>
                        <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#22c55e' }}>🎉 New Achievements Unlocked!</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {newAchievements.map((achievement, idx) => (
                                <div key={idx} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    padding: '1rem',
                                    background: 'rgba(34, 197, 94, 0.1)',
                                    borderRadius: '8px',
                                    animation: 'slideIn 0.5s ease-out'
                                }}>
                                    <div style={{ fontSize: '2rem' }}>{achievement.icon}</div>
                                    <div>
                                        <div style={{ fontWeight: '600' }}>{achievement.name}</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            {achievement.description}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    const currentQuestion = quiz.questions[currentQuestionIndex];

    return (
        <div className="glass-card" style={{ maxWidth: '800px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '1rem', fontWeight: '500' }}>Score: {score}</span>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: timeLeft <= 5
                            ? 'rgba(239, 68, 68, 0.2)'
                            : timeLeft <= 10
                                ? 'rgba(251, 146, 60, 0.2)'
                                : 'rgba(34, 197, 94, 0.2)',
                        border: `2px solid ${timeLeft <= 5
                            ? '#ef4444'
                            : timeLeft <= 10
                                ? '#fb923c'
                                : '#22c55e'}`,
                        borderRadius: '12px',
                        padding: '0.5rem 1rem',
                        minWidth: '80px',
                        justifyContent: 'center'
                    }}>
                        <span style={{ fontSize: '0.85rem', marginRight: '0.25rem' }}>⏱️</span>
                        <span style={{
                            fontSize: '1.5rem',
                            fontWeight: 'bold',
                            color: timeLeft <= 5
                                ? '#ef4444'
                                : timeLeft <= 10
                                    ? '#fb923c'
                                    : '#22c55e'
                        }}>
                            {timeLeft}s
                        </span>
                    </div>
                </div>
                <button
                    onClick={() => setShowEndConfirm(true)}
                    style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#ef4444',
                        padding: '0.5rem 1rem',
                        fontSize: '0.85rem',
                        borderRadius: '8px'
                    }}
                >
                    End Quiz
                </button>
            </div>

            {/* Custom End Quiz Confirmation Modal */}
            {showEndConfirm && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    backdropFilter: 'blur(4px)'
                }}>
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(30, 30, 50, 0.95), rgba(20, 20, 40, 0.95))',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '16px',
                        padding: '2rem',
                        maxWidth: '400px',
                        width: '90%',
                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
                    }}>
                        <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.5rem' }}>
                            End Quiz?
                        </h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: '1.6' }}>
                            Are you sure you want to end the quiz? Your current progress will be saved.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={() => setShowEndConfirm(false)}
                                style={{
                                    flex: 1,
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                    padding: '0.75rem',
                                    fontSize: '1rem'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setShowEndConfirm(false);
                                    setGameOver(true);
                                }}
                                style={{
                                    flex: 1,
                                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(220, 38, 38, 0.3))',
                                    border: '1px solid rgba(239, 68, 68, 0.5)',
                                    color: '#ef4444',
                                    padding: '0.75rem',
                                    fontSize: '1rem',
                                    fontWeight: '600'
                                }}
                            >
                                End Quiz
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <h3>Question {currentQuestionIndex + 1} of {quiz.questions.length}</h3>
            <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>{currentQuestion.text}</p>

            {feedback && (
                <div style={{
                    padding: '1rem',
                    marginBottom: '1rem',
                    borderRadius: '8px',
                    background: feedback.correct ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    border: `1px solid ${feedback.correct ? '#22c55e' : '#ef4444'} `
                }}>
                    {feedback.correct ? 'Correct!' : `Wrong! The answer was ${feedback.correctAnswer} `}
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
