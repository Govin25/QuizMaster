import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API_URL from '../config';

const ChallengeResults = ({ challengeId, onClose, onRematch }) => {
    const { user, fetchWithAuth } = useAuth();
    const [challenge, setChallenge] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showWinner, setShowWinner] = useState(false);

    useEffect(() => {
        fetchChallengeDetails();
    }, [challengeId]);

    useEffect(() => {
        if (challenge) {
            // Delay winner reveal for dramatic effect
            setTimeout(() => setShowWinner(true), 500);
        }
    }, [challenge]);

    const fetchChallengeDetails = async () => {
        try {
            const response = await fetchWithAuth(`${API_URL}/api/challenges/${challengeId}`);
            if (!response.ok) throw new Error('Failed to fetch challenge details');

            const data = await response.json();
            setChallenge(data.challenge);
        } catch (err) {
            console.error('Failed to fetch challenge:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="glass-card" style={{ textAlign: 'center' }}>
                <h2>Loading Results...</h2>
            </div>
        );
    }

    if (!challenge) {
        return (
            <div className="glass-card" style={{ textAlign: 'center' }}>
                <h2>Challenge not found</h2>
                <button onClick={onClose}>Back</button>
            </div>
        );
    }

    const isCreator = challenge.creator_id === user.id;
    const myScore = isCreator ? challenge.creator_score : challenge.opponent_score;
    const opponentScore = isCreator ? challenge.opponent_score : challenge.creator_score;
    const myTime = isCreator ? challenge.creator_time : challenge.opponent_time;
    const opponentTime = isCreator ? challenge.opponent_time : challenge.creator_time;
    const opponentName = isCreator ? challenge.opponent_username : challenge.creator_username;

    const isWinner = challenge.winner_id === user.id;
    const isDraw = !challenge.winner_id;

    return (
        <div className="glass-card" style={{ maxWidth: '800px', width: '100%' }}>
            {/* Winner Announcement */}
            <div style={{
                textAlign: 'center',
                marginBottom: '3rem',
                padding: '2rem',
                background: isWinner
                    ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1))'
                    : isDraw
                        ? 'linear-gradient(135deg, rgba(251, 146, 60, 0.1), rgba(249, 115, 22, 0.1))'
                        : 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.1))',
                border: isWinner
                    ? '2px solid rgba(34, 197, 94, 0.3)'
                    : isDraw
                        ? '2px solid rgba(251, 146, 60, 0.3)'
                        : '2px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '16px',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {showWinner && (
                    <>
                        <div style={{
                            fontSize: '5rem',
                            marginBottom: '1rem',
                            animation: 'bounceIn 0.6s ease-out'
                        }}>
                            {isWinner ? '🏆' : isDraw ? '🤝' : '😔'}
                        </div>
                        <h1 style={{
                            margin: '0 0 0.5rem 0',
                            fontSize: '2.5rem',
                            color: isWinner ? '#22c55e' : isDraw ? '#fb923c' : '#ef4444',
                            animation: 'fadeIn 0.8s ease-out'
                        }}>
                            {isWinner ? 'Victory!' : isDraw ? 'Draw!' : 'Defeat'}
                        </h1>
                        <p style={{
                            fontSize: '1.2rem',
                            color: 'var(--text-muted)',
                            margin: 0
                        }}>
                            {isWinner
                                ? `You defeated ${opponentName}!`
                                : isDraw
                                    ? `You tied with ${opponentName}!`
                                    : `${opponentName} won this round!`
                            }
                        </p>
                    </>
                )}
            </div>

            {/* Score Comparison */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                gap: '2rem',
                marginBottom: '3rem',
                alignItems: 'center'
            }}>
                {/* Your Score */}
                <div style={{
                    textAlign: 'center',
                    padding: '2rem',
                    background: isWinner
                        ? 'rgba(34, 197, 94, 0.1)'
                        : 'rgba(255, 255, 255, 0.05)',
                    border: isWinner
                        ? '2px solid rgba(34, 197, 94, 0.3)'
                        : '1px solid var(--glass-border)',
                    borderRadius: '12px'
                }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        You
                    </div>
                    <div style={{
                        fontSize: '3rem',
                        fontWeight: 'bold',
                        color: isWinner ? '#22c55e' : 'white',
                        marginBottom: '0.5rem'
                    }}>
                        {myScore}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        ⏱️ {myTime}s
                    </div>
                </div>

                {/* VS */}
                <div style={{
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    color: 'var(--text-muted)'
                }}>
                    VS
                </div>

                {/* Opponent Score */}
                <div style={{
                    textAlign: 'center',
                    padding: '2rem',
                    background: !isWinner && !isDraw
                        ? 'rgba(34, 197, 94, 0.1)'
                        : 'rgba(255, 255, 255, 0.05)',
                    border: !isWinner && !isDraw
                        ? '2px solid rgba(34, 197, 94, 0.3)'
                        : '1px solid var(--glass-border)',
                    borderRadius: '12px'
                }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        {opponentName}
                    </div>
                    <div style={{
                        fontSize: '3rem',
                        fontWeight: 'bold',
                        color: !isWinner && !isDraw ? '#22c55e' : 'white',
                        marginBottom: '0.5rem'
                    }}>
                        {opponentScore}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        ⏱️ {opponentTime}s
                    </div>
                </div>
            </div>

            {/* Detailed Stats */}
            <div style={{
                background: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '2rem'
            }}>
                <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>📊 Detailed Stats</h3>

                <div style={{ display: 'grid', gap: '1rem' }}>
                    {/* Score Difference */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '8px'
                    }}>
                        <span style={{ color: 'var(--text-muted)' }}>Score Difference</span>
                        <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                            {Math.abs(myScore - opponentScore)} points
                        </span>
                    </div>

                    {/* Time Difference */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '8px'
                    }}>
                        <span style={{ color: 'var(--text-muted)' }}>Time Difference</span>
                        <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                            {Math.abs(myTime - opponentTime)}s
                        </span>
                    </div>

                    {/* Faster Player */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '8px'
                    }}>
                        <span style={{ color: 'var(--text-muted)' }}>Faster Player</span>
                        <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                            {myTime < opponentTime ? '⚡ You' : `⚡ ${opponentName}`}
                        </span>
                    </div>

                    {/* Quiz Info */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '8px'
                    }}>
                        <span style={{ color: 'var(--text-muted)' }}>Quiz</span>
                        <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                            {challenge.quiz_title}
                        </span>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                    onClick={onClose}
                    style={{
                        flex: 1,
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        padding: '0.75rem',
                        fontSize: '1rem',
                        cursor: 'pointer',
                        borderRadius: '8px'
                    }}
                >
                    ← Back to Challenges
                </button>
                <button
                    onClick={() => onRematch(challenge.quiz_id, opponentName)}
                    style={{
                        flex: 1,
                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        border: 'none',
                        color: 'white',
                        padding: '0.75rem',
                        fontSize: '1rem',
                        cursor: 'pointer',
                        borderRadius: '8px',
                        fontWeight: '600'
                    }}
                >
                    🔄 Rematch!
                </button>
            </div>

            {/* Confetti Animation for Winners */}
            {isWinner && showWinner && (
                <style>{`
          @keyframes bounceIn {
            0% { transform: scale(0); opacity: 0; }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
            )}
        </div>
    );
};

export default ChallengeResults;
