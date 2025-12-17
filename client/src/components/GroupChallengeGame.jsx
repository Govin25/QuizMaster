import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import API_URL from '../config';
import { useAuth } from '../context/AuthContext';

const GroupChallengeGame = ({ roomId, quizId, onShowResults, onBack }) => {
    const { user, fetchWithAuth } = useAuth();
    const [socket, setSocket] = useState(null);
    const [quiz, setQuiz] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [myScore, setMyScore] = useState(0);
    const [leaderboard, setLeaderboard] = useState([]);
    const [timeLeft, setTimeLeft] = useState(30);
    const [gameOver, setGameOver] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const [questionStartTime, setQuestionStartTime] = useState(Date.now());
    const [quizStartTime] = useState(Date.now());
    const [autoEndTimer, setAutoEndTimer] = useState(null);
    const [completionStatus, setCompletionStatus] = useState({ completed: 0, total: 0 });

    const scoreRef = useRef(myScore);
    const quizRef = useRef(null);
    const currentQuestionIndexRef = useRef(0);
    const feedbackRef = useRef(null);

    useEffect(() => {
        scoreRef.current = myScore;
    }, [myScore]);

    useEffect(() => {
        quizRef.current = quiz;
    }, [quiz]);

    useEffect(() => {
        currentQuestionIndexRef.current = currentQuestionIndex;
    }, [currentQuestionIndex]);

    useEffect(() => {
        feedbackRef.current = feedback;
    }, [feedback]);

    useEffect(() => {
        fetchQuiz();

        const newSocket = io(API_URL);
        setSocket(newSocket);

        // CRITICAL: Join the correct socket room
        newSocket.on('connect', () => {
            console.log('Socket connected, joining room:', roomId);
            newSocket.emit('join_group_challenge_room', { roomId, userId: user.id, username: user.username });
        });

        newSocket.on('leaderboard_update', ({ leaderboard: lb }) => {
            console.log('Leaderboard update received:', lb);
            // Sort by score descending
            const sortedLeaderboard = [...lb].sort((a, b) => b.score - a.score);
            setLeaderboard(sortedLeaderboard);
        });

        newSocket.on('group_challenge_answer_result', (result) => {
            console.log('Answer result received:', result, 'Current index:', currentQuestionIndexRef.current);

            // Prevent processing if already showing feedback
            if (feedbackRef.current) {
                console.log('Already showing feedback, ignoring duplicate result');
                return;
            }

            setFeedback({
                isCorrect: result.isCorrect,
                correctAnswer: result.correctAnswer,
                points: result.points
            });
            setMyScore(result.newScore);

            // Show feedback for 2 seconds, then advance
            setTimeout(() => {
                setFeedback(null);

                // Use ref to get current question index
                const currentQuiz = quizRef.current;
                const currentIdx = currentQuestionIndexRef.current;

                if (!currentQuiz || !currentQuiz.questions) {
                    console.error('Quiz not loaded');
                    return;
                }

                const totalQuestions = currentQuiz.questions.length;
                const nextIndex = currentIdx + 1;

                console.log(`Advancing from question ${currentIdx + 1} to ${nextIndex + 1}/${totalQuestions}`);

                if (nextIndex >= totalQuestions) {
                    console.log('All questions answered, setting gameOver');
                    setGameOver(true);
                } else {
                    setCurrentQuestionIndex(nextIndex);
                    setTimeLeft(30);
                }
            }, 2000);
        });

        newSocket.on('participant_completed', ({ completedCount, totalParticipants }) => {
            console.log(`${completedCount}/${totalParticipants} players completed`);
            setCompletionStatus({ completed: completedCount, total: totalParticipants });

            // If all players completed, redirect soon
            if (completedCount === totalParticipants) {
                console.log('All players completed, will show results soon');
            }
        });

        newSocket.on('auto_end_timer_started', ({ timeRemaining }) => {
            console.log('Auto-end timer started:', timeRemaining);
            setAutoEndTimer(timeRemaining);
        });

        newSocket.on('group_challenge_finished', ({ participants, winner }) => {
            console.log('Challenge finished, showing results');
            onShowResults(roomId);
        });

        return () => {
            newSocket.emit('leave_group_challenge', { roomId, userId: user.id });
            newSocket.close();
        };
    }, []);

    // Countdown for auto-end timer
    useEffect(() => {
        if (autoEndTimer === null || autoEndTimer <= 0) return;
        const timer = setTimeout(() => setAutoEndTimer(prev => prev - 1), 1000);
        return () => clearTimeout(timer);
    }, [autoEndTimer]);

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
        if (gameOver && socket) {
            const totalTime = Math.floor((Date.now() - quizStartTime) / 1000);
            const finalScore = scoreRef.current;

            console.log('Emitting player completion:', {
                roomId,
                userId: user.id,
                finalScore,
                totalTime
            });

            socket.emit('group_challenge_player_complete', {
                roomId,
                userId: user.id,
                finalScore: finalScore,
                totalTime
            });
        }
    }, [gameOver]);

    const fetchQuiz = async () => {
        try {
            const response = await fetchWithAuth(`${API_URL}/api/quizzes/${quizId}`);
            const data = await response.json();
            setQuiz(data);
        } catch (err) {
            console.error('Failed to fetch quiz:', err);
        }
    };

    const handleNextQuestion = () => {
        const currentQuiz = quizRef.current || quiz;
        if (!currentQuiz || !currentQuiz.questions) {
            console.error('Quiz not loaded yet');
            return;
        }

        // Submit timeout answer to server (null answer means no answer given)
        const question = currentQuiz.questions[currentQuestionIndex];
        const timeTaken = 30; // Full time elapsed

        console.log('Time expired, submitting timeout for question:', question.id);

        if (socket) {
            socket.emit('group_challenge_submit_answer', {
                roomId,
                questionId: question.id,
                answer: null, // No answer - timeout
                timeTaken,
                currentQuestionIndex,
                userId: user.id,
                isTimeout: true
            });
        }
    };

    const submitAnswer = (answer) => {
        // Prevent duplicate submissions
        if (feedback) {
            console.log('Already processing answer, ignoring duplicate submission');
            return;
        }

        const question = quiz.questions[currentQuestionIndex];
        const timeTaken = Math.floor((Date.now() - questionStartTime) / 1000);

        console.log('Submitting answer:', { questionId: question.id, answer, timeTaken });

        socket.emit('group_challenge_submit_answer', {
            roomId,
            questionId: question.id,
            answer,
            timeTaken,
            currentQuestionIndex,
            userId: user.id
        });
    };

    if (!quiz) {
        return <div className="glass-card"><h2>Loading...</h2></div>;
    }

    if (gameOver) {
        // Get my score from leaderboard (source of truth) or fall back to local state
        const myLeaderboardEntry = leaderboard.find(p => p.user_id === user.id);
        const displayScore = myLeaderboardEntry?.score ?? myScore ?? 0;
        const myRank = leaderboard.findIndex(p => p.user_id === user.id) + 1;

        return (
            <div style={{ display: 'flex', gap: '1rem', maxWidth: '1400px', width: '100%', flexWrap: 'wrap', justifyContent: 'center' }}>
                {/* Main completion card */}
                <div className="glass-card" style={{ textAlign: 'center', flex: '1 1 350px', minWidth: '300px' }}>
                    <h2>🎉 Quiz Complete!</h2>

                    {/* Show completion status */}
                    {completionStatus.total > 0 && (
                        <div style={{
                            margin: '1.5rem 0',
                            padding: '1rem',
                            background: completionStatus.completed === completionStatus.total
                                ? 'rgba(34, 197, 94, 0.2)'
                                : 'rgba(99, 102, 241, 0.1)',
                            borderRadius: '12px'
                        }}>
                            <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                                {completionStatus.completed === completionStatus.total
                                    ? '✅ All players finished!'
                                    : `⏳ ${completionStatus.completed}/${completionStatus.total} players finished`}
                            </div>
                        </div>
                    )}

                    {/* Auto-end timer warning */}
                    {autoEndTimer !== null && autoEndTimer > 0 && (
                        <div style={{
                            marginTop: '1rem',
                            padding: '1rem',
                            background: 'rgba(251, 146, 60, 0.2)',
                            border: '2px solid rgba(251, 146, 60, 0.5)',
                            borderRadius: '12px'
                        }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fb923c' }}>
                                Results in {autoEndTimer}s
                            </div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                Waiting for other players to finish
                            </div>
                        </div>
                    )}

                    {/* Score display */}
                    <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px' }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                            Your Score
                        </div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                            {displayScore}
                        </div>
                        {myRank > 0 && completionStatus.total > 0 && completionStatus.completed < completionStatus.total && (
                            <div style={{ fontSize: '1rem', color: '#a5b4fc', marginTop: '0.5rem' }}>
                                Currently #{myRank}
                            </div>
                        )}
                    </div>

                    {/* Loading indicator if still waiting */}
                    {completionStatus.total > 0 && completionStatus.completed < completionStatus.total && autoEndTimer === null && (
                        <div style={{ marginTop: '1.5rem', color: 'var(--text-muted)' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
                            Waiting for other players...
                        </div>
                    )}
                </div>

                {/* Live Leaderboard on game over */}
                {leaderboard.length > 0 && (
                    <div className="glass-card" style={{ flex: '1 1 350px', minWidth: '300px' }}>
                        <h3 style={{ marginBottom: '1rem', textAlign: 'center' }}>🏆 Live Standings</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {leaderboard.map((participant, index) => {
                                const isMe = participant.user_id === user.id;
                                const rank = index + 1;

                                return (
                                    <div
                                        key={participant.user_id}
                                        style={{
                                            background: isMe ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                            border: isMe ? '2px solid rgba(99, 102, 241, 0.5)' : '1px solid var(--glass-border)',
                                            borderRadius: '8px',
                                            padding: '0.75rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            transition: 'all 0.3s'
                                        }}
                                    >
                                        {/* Rank */}
                                        <div style={{
                                            fontSize: '1.2rem',
                                            fontWeight: 'bold',
                                            minWidth: '30px',
                                            color: rank === 1 ? '#fbbf24' : rank === 2 ? '#c0c0c0' : rank === 3 ? '#cd7f32' : 'var(--text-muted)'
                                        }}>
                                            {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                                        </div>

                                        {/* Info */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontWeight: '600',
                                                fontSize: '0.9rem',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis'
                                            }}>
                                                {participant.username}{isMe && ' (You)'}
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                Score: {participant.score ?? 0}
                                            </div>
                                        </div>

                                        {/* Completed Badge */}
                                        {participant.completed && (
                                            <div style={{ fontSize: '1rem' }}>✅</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Back to Challenges button - full width at bottom */}
                {onBack && (
                    <div style={{ width: '100%', textAlign: 'center', marginTop: '1rem' }}>
                        <button
                            onClick={onBack}
                            style={{
                                padding: '0.75rem 2rem',
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                borderRadius: '8px',
                                color: 'white',
                                fontSize: '1rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            ← Back to Challenges
                        </button>
                    </div>
                )}
            </div>
        );
    }

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const myRank = leaderboard.findIndex(p => p.user_id === user.id) + 1;

    console.log('Rank calculation:', {
        leaderboard,
        userId: user.id,
        myRank,
        leaderboardLength: leaderboard.length
    });

    return (
        <div style={{ display: 'flex', gap: '1rem', maxWidth: '1400px', width: '100%', flexWrap: 'wrap' }}>
            {/* Main Quiz Area */}
            <div className="glass-card" style={{ flex: '1 1 600px' }}>
                {/* Auto-end Warning */}
                {autoEndTimer !== null && autoEndTimer > 0 && (
                    <div style={{
                        padding: '1rem',
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '2px solid rgba(239, 68, 68, 0.5)',
                        borderRadius: '12px',
                        marginBottom: '1rem',
                        textAlign: 'center',
                        animation: 'pulse 2s infinite'
                    }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#ef4444' }}>
                            ⚠️ Auto-ending in {autoEndTimer}s
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            A player has finished!
                        </div>
                    </div>
                )}

                {/* Timer */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: timeLeft <= 5 ? 'rgba(239, 68, 68, 0.2)' : timeLeft <= 10 ? 'rgba(251, 146, 60, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                        border: `2px solid ${timeLeft <= 5 ? '#ef4444' : timeLeft <= 10 ? '#fb923c' : '#22c55e'}`,
                        borderRadius: '12px',
                        padding: '0.75rem 1.5rem'
                    }}>
                        <span style={{ fontSize: '1rem' }}>⏱️</span>
                        <span style={{
                            fontSize: '2rem',
                            fontWeight: 'bold',
                            color: timeLeft <= 5 ? '#ef4444' : timeLeft <= 10 ? '#fb923c' : '#22c55e'
                        }}>
                            {timeLeft}s
                        </span>
                    </div>
                </div>

                {/* Question */}
                <h3 style={{ marginBottom: '1rem' }}>
                    Question {currentQuestionIndex + 1} of {quiz.questions.length}
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
                        background: feedback.isCorrect ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        border: `1px solid ${feedback.isCorrect ? '#22c55e' : '#ef4444'}`
                    }}>
                        {feedback.isCorrect ? `✅ Correct! +${feedback.points} points` : `❌ Wrong! The answer was ${feedback.correctAnswer}`}
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
                            <button onClick={() => submitAnswer('true')} disabled={!!feedback}>True</button>
                            <button onClick={() => submitAnswer('false')} disabled={!!feedback}>False</button>
                        </>
                    )}
                </div>
            </div>

            {/* Live Leaderboard Sidebar */}
            <div className="glass-card" style={{ flex: '0 0 300px', minWidth: '250px' }}>
                <h3 style={{ marginBottom: '1rem', textAlign: 'center' }}>🏆 Live Leaderboard</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {leaderboard.map((participant, index) => {
                        const isMe = participant.user_id === user.id;
                        const rank = index + 1;

                        return (
                            <div
                                key={participant.user_id}
                                style={{
                                    background: isMe ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                    border: isMe ? '2px solid rgba(99, 102, 241, 0.5)' : '1px solid var(--glass-border)',
                                    borderRadius: '8px',
                                    padding: '0.75rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    transition: 'all 0.3s'
                                }}
                            >
                                {/* Rank */}
                                <div style={{
                                    fontSize: '1.2rem',
                                    fontWeight: 'bold',
                                    minWidth: '30px',
                                    color: rank === 1 ? '#fbbf24' : rank === 2 ? '#c0c0c0' : rank === 3 ? '#cd7f32' : 'var(--text-muted)'
                                }}>
                                    {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                                </div>

                                {/* Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontWeight: '600',
                                        fontSize: '0.9rem',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        {participant.username}{isMe && ' (You)'}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        Score: {participant.score}
                                    </div>
                                </div>

                                {/* Completed Badge */}
                                {participant.completed && (
                                    <div style={{ fontSize: '1rem' }}>✅</div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Your Stats - Only show rank since score is in leaderboard */}
                <div style={{
                    marginTop: '1.5rem',
                    padding: '1rem',
                    background: 'rgba(99, 102, 241, 0.1)',
                    borderRadius: '8px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        Your Current Rank
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#a5b4fc' }}>
                        {myRank > 0 ? `#${myRank}` : '-'}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GroupChallengeGame;
