import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import API_URL from '../config';
import { useAuth } from '../context/AuthContext';

const ChallengeGame = ({ challengeId, quizId, onEndGame, onShowResults }) => {
    const { user, fetchWithAuth } = useAuth();
    const [socket, setSocket] = useState(null);
    const [quiz, setQuiz] = useState(null);
    const [challenge, setChallenge] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [myScore, setMyScore] = useState(0);
    const [opponentScore, setOpponentScore] = useState(0);
    const [opponentProgress, setOpponentProgress] = useState(0);
    const [timeLeft, setTimeLeft] = useState(30);
    const [gameOver, setGameOver] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const [questionStartTime, setQuestionStartTime] = useState(Date.now());
    const [quizStartTime] = useState(Date.now());
    const [opponentFinished, setOpponentFinished] = useState(false);
    const [waitingForOpponent, setWaitingForOpponent] = useState(false);
    const [resultId, setResultId] = useState(null);
    const [waitingInLobby, setWaitingInLobby] = useState(true);
    const [opponentJoined, setOpponentJoined] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);
    const [countdown, setCountdown] = useState(null);

    // Handle countdown timer
    useEffect(() => {
        if (countdown === null) return;

        if (countdown > 0) {
            const timer = setTimeout(() => {
                setCountdown(prev => prev - 1);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const scoreRef = useRef(myScore);
    const socketRef = useRef(socket);

    useEffect(() => {
        scoreRef.current = myScore;
    }, [myScore]);

    useEffect(() => {
        socketRef.current = socket;
    }, [socket]);

    // Fetch quiz and challenge details
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [quizRes, challengeRes] = await Promise.all([
                    fetchWithAuth(`${API_URL}/api/quizzes/${quizId}`),
                    fetchWithAuth(`${API_URL}/api/challenges/${challengeId}`)
                ]);

                const quizData = await quizRes.json();
                const challengeData = await challengeRes.json();

                setQuiz(quizData);
                setChallenge(challengeData.challenge);
            } catch (err) {
                console.error('Failed to fetch data:', err);
            }
        };

        fetchData();
    }, [quizId, challengeId]);

    // Setup Socket.IO
    useEffect(() => {
        if (!quiz || !challenge) return;

        // Reset scores when starting a new challenge
        setMyScore(0);
        setOpponentScore(0);
        setCurrentQuestionIndex(0);
        setGameOver(false);
        setOpponentFinished(false);
        setWaitingForOpponent(false);

        const newSocket = io(API_URL);
        setSocket(newSocket);

        // Register listeners BEFORE joining to ensure we don't miss events

        // Listen for opponent joining
        newSocket.on('opponent_joined', ({ userId: opponentId }) => {
            if (opponentId !== user.id) {
                setOpponentJoined(true);
            }
        });

        // Listen for both players ready signal
        newSocket.on('both_players_ready', () => {
            console.log('Received both_players_ready event');
            setOpponentJoined(true);
            setWaitingForOpponent(false); // Ensure we stop waiting
            setCountdown(3);
        });

        // Listen for game start signal
        newSocket.on('challenge_start', () => {
            console.log('Received challenge_start event');
            setWaitingInLobby(false);
            setGameStarted(true);
        });

        // Listen for waiting status
        newSocket.on('waiting_for_opponent', () => {
            setOpponentJoined(false);
        });

        // Listen for opponent progress
        newSocket.on('opponent_progress', ({ userId: opponentId, currentQuestion, score, isCorrect }) => {
            if (opponentId !== user.id) {
                setOpponentScore(score);
                setOpponentProgress(currentQuestion + 1);
            }
        });

        // Listen for opponent finished
        newSocket.on('opponent_finished', ({ userId: opponentId, score, time }) => {
            if (opponentId !== user.id) {
                setOpponentFinished(true);
                setOpponentScore(score);
            }
        });

        // Listen for challenge finished
        newSocket.on('challenge_finished', ({ winnerId, result, participants }) => {
            setGameOver(true);
            setWaitingForOpponent(false);
        });

        // Listen for force end
        newSocket.on('force_challenge_end', ({ reason, message }) => {
            if (!gameOver) {
                saveResult();
                alert(message || 'Quiz ended because your opponent finished.');
            }
        });

        // Listen for answer results
        newSocket.on('challenge_answer_result', (result) => {
            setFeedback(result);
            setMyScore(result.newScore);
            setTimeout(() => {
                setFeedback(null);
                handleNextQuestion();
            }, 2000);
        });

        // Join challenge room and notify about joining
        newSocket.emit('join_challenge', { userId: user.id, challengeId, username: user.username });



        return () => {
            newSocket.emit('leave_challenge', { challengeId });
            newSocket.close();
        };
    }, [quiz, challenge, challengeId, user.id]);

    // Reset question start time when question changes
    useEffect(() => {
        setQuestionStartTime(Date.now());
    }, [currentQuestionIndex]);

    // Timer
    useEffect(() => {
        if (timeLeft > 0 && !gameOver && !feedback) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        } else if (timeLeft === 0 && !gameOver && !feedback) {
            handleNextQuestion();
        }
    }, [timeLeft, gameOver, feedback]);

    // Handle quiz completion
    useEffect(() => {
        if (gameOver && socketRef.current && resultId) {
            const totalTime = Math.floor((Date.now() - quizStartTime) / 1000);
            socketRef.current.emit('challenge_complete', {
                challengeId,
                userId: user.id,
                finalScore: scoreRef.current,
                totalTime,
                resultId
            });
        }
    }, [gameOver, resultId, challengeId, quizStartTime, user.id]);

    const handleNextQuestion = () => {
        setTimeLeft(30);
        setCurrentQuestionIndex(prev => {
            if (prev + 1 >= (quiz?.questions?.length || 0)) {
                // Save result first, then mark as game over
                saveResult();
                return prev;
            }
            return prev + 1;
        });
    };

    const saveResult = async () => {
        try {
            const { Result, QuestionAttempt } = await import('../../../server/src/models/sequelize');
            const totalQuestions = quiz.questions.length;
            const maxScore = totalQuestions * 10;
            const actualPercentage = totalQuestions > 0 ? Math.round((scoreRef.current / maxScore) * 100) : 0;

            const response = await fetchWithAuth(`${API_URL}/api/results`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    quizId,
                    score: scoreRef.current,
                    percentage: actualPercentage
                })
            });

            if (response.ok) {
                const data = await response.json();
                setResultId(data.resultId);
                setGameOver(true);
                setWaitingForOpponent(!opponentFinished);
            }
        } catch (err) {
            console.error('Failed to save result:', err);
            setGameOver(true);
        }
    };

    const submitAnswer = (answer) => {
        if (feedback) return;

        const question = quiz.questions[currentQuestionIndex];
        const timeTaken = Math.floor((Date.now() - questionStartTime) / 1000);

        socket.emit('challenge_submit_answer', {
            challengeId,
            questionId: question.id,
            answer,
            timeTaken,
            currentQuestionIndex,
            userId: user.id
        });
    };

    if (!quiz || !challenge) {
        return (
            <div className="glass-card">
                <h2>Loading Challenge...</h2>
            </div>
        );
    }

    // Waiting lobby - show while waiting for opponent to join
    if (waitingInLobby) {
        return (
            <div className="glass-card" style={{ textAlign: 'center', maxWidth: '600px', width: '100%' }}>
                <h2>🎮 Challenge Lobby</h2>
                <div style={{ fontSize: '4rem', margin: '2rem 0', animation: 'pulse 2s infinite' }}>
                    {opponentJoined ? '✅' : '⏳'}
                </div>
                <h3 style={{ marginBottom: '1rem' }}>
                    {opponentJoined ? 'Both Players Ready!' : 'Waiting for opponent to join...'}
                </h3>
                <div style={{
                    padding: '1.5rem',
                    background: 'rgba(99, 102, 241, 0.1)',
                    borderRadius: '12px',
                    marginTop: '2rem'
                }}>
                    <div style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                        Challenge: <strong style={{ color: 'white' }}>{quiz.title}</strong>
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        Opponent: <strong style={{ color: 'white' }}>
                            {challenge.creator_id === user.id ? challenge.opponent_username : challenge.creator_username}
                        </strong>
                    </div>
                </div>
                {opponentJoined && (
                    <div style={{
                        marginTop: '2rem',
                        padding: '1.5rem',
                        background: countdown ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        borderRadius: '12px',
                        color: '#22c55e',
                        fontWeight: '600'
                    }}>
                        {countdown ? (
                            <div style={{ fontSize: '3rem', animation: 'pulse 0.5s infinite' }}>
                                {countdown}
                            </div>
                        ) : (
                            <div style={{ animation: 'pulse 1s infinite' }}>
                                🚀 Starting quiz...
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    if (gameOver) {
        if (waitingForOpponent) {
            return (
                <div className="glass-card" style={{ textAlign: 'center' }}>
                    <h2>🎉 You Finished!</h2>
                    <div style={{ fontSize: '3rem', margin: '2rem 0' }}>⏳</div>
                    <h3>Waiting for opponent to finish...</h3>
                    <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                            Your Score: {myScore}
                        </div>
                    </div>
                    <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>
                        They have 30 seconds to complete...
                    </p>
                </div>
            );
        }

        return (
            <div className="glass-card" style={{ textAlign: 'center' }}>
                <h2>Challenge Complete!</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                    View the detailed results to see who won!
                </p>
                <button onClick={() => onShowResults(challengeId)}>
                    📊 View Results
                </button>
            </div>
        );
    }

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const totalQuestions = quiz.questions.length;
    const myProgress = ((currentQuestionIndex + 1) / totalQuestions) * 100;
    const opponentProgressPercent = (opponentProgress / totalQuestions) * 100;

    return (
        <div className="glass-card" style={{ maxWidth: '900px', width: '100%' }}>
            {/* Score Comparison Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
                padding: '1.5rem',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '12px'
            }}>
                {/* Your Score */}
                <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        You
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#22c55e' }}>
                        {myScore}
                    </div>
                    <div style={{
                        width: '100%',
                        height: '8px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '4px',
                        marginTop: '0.5rem',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            width: `${myProgress}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                            transition: 'width 0.3s'
                        }} />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {currentQuestionIndex + 1}/{totalQuestions}
                    </div>
                </div>

                {/* VS */}
                <div style={{
                    padding: '0 2rem',
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    color: 'var(--text-muted)'
                }}>
                    VS
                </div>

                {/* Opponent Score */}
                <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        {challenge.creator_id === user.id ? challenge.opponent_username : challenge.creator_username}
                    </div>
                    <div style={{
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        color: '#6366f1',
                        position: 'relative'
                    }}>
                        {opponentScore}
                        {opponentFinished && (
                            <span style={{ fontSize: '1rem', marginLeft: '0.5rem' }}>✅</span>
                        )}
                    </div>
                    <div style={{
                        width: '100%',
                        height: '8px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '4px',
                        marginTop: '0.5rem',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            width: `${opponentProgressPercent}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #6366f1, #4f46e5)',
                            transition: 'width 0.3s'
                        }} />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {opponentProgress}/{totalQuestions}
                    </div>
                </div>
            </div>

            {/* Status Message */}
            {myScore > opponentScore && (
                <div style={{
                    textAlign: 'center',
                    padding: '0.75rem',
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: '8px',
                    marginBottom: '1.5rem',
                    color: '#22c55e',
                    fontWeight: '600'
                }}>
                    🔥 You're in the lead!
                </div>
            )}
            {myScore < opponentScore && (
                <div style={{
                    textAlign: 'center',
                    padding: '0.75rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    marginBottom: '1.5rem',
                    color: '#ef4444',
                    fontWeight: '600'
                }}>
                    ⚡ Opponent is ahead!
                </div>
            )}

            {/* Opponent Finished Notification */}
            {opponentFinished && !gameOver && (
                <div style={{
                    textAlign: 'center',
                    padding: '1rem',
                    background: 'rgba(251, 146, 60, 0.2)',
                    border: '2px solid rgba(251, 146, 60, 0.5)',
                    borderRadius: '12px',
                    marginBottom: '1.5rem',
                    animation: 'pulse 2s infinite'
                }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fb923c', marginBottom: '0.5rem' }}>
                        ⚠️ Opponent Has Finished!
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        Quiz will auto-end in 30 seconds
                    </div>
                </div>
            )}

            {/* Timer */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '1.5rem'
            }}>
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
                    padding: '0.75rem 1.5rem'
                }}>
                    <span style={{ fontSize: '1rem' }}>⏱️</span>
                    <span style={{
                        fontSize: '2rem',
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

            {/* Question */}
            <h3 style={{ marginBottom: '1rem' }}>
                Question {currentQuestionIndex + 1} of {totalQuestions}
            </h3>
            <p style={{ fontSize: '1.2rem', marginBottom: '2rem', lineHeight: '1.6' }}>
                {currentQuestion.text}
            </p>

            {/* Feedback */}
            {feedback && (
                <div style={{
                    padding: '1rem',
                    marginBottom: '1rem',
                    borderRadius: '8px',
                    background: feedback.correct ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    border: `1px solid ${feedback.correct ? '#22c55e' : '#ef4444'}`
                }}>
                    {feedback.correct ? '✅ Correct!' : `❌ Wrong! The answer was ${feedback.correctAnswer}`}
                </div>
            )}

            {/* Answer Options */}
            <div className="grid">
                {currentQuestion.type === 'multiple_choice' ? (
                    currentQuestion.options.map((option, idx) => (
                        <button
                            key={idx}
                            onClick={() => submitAnswer(option)}
                            disabled={!!feedback}
                            style={{
                                opacity: feedback ? 0.6 : 1,
                                cursor: feedback ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {option}
                        </button>
                    ))
                ) : (
                    <>
                        <button onClick={() => submitAnswer('true')} disabled={!!feedback}>
                            True
                        </button>
                        <button onClick={() => submitAnswer('false')} disabled={!!feedback}>
                            False
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default ChallengeGame;
