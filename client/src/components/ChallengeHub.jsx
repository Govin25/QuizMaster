import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import API_URL from '../config';

const ChallengeHub = ({ onStartChallenge, onViewResults, onCreateChallenge }) => {
    const { user, fetchWithAuth } = useAuth();
    const { showSuccess, showError } = useToast();

    const [activeTab, setActiveTab] = useState('pending');
    const [challenges, setChallenges] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchChallenges();
        fetchStats();

        // Listen for challenge notifications
        const socket = io(API_URL);

        // Listen for challenge declined notifications
        socket.on('challenge_declined', ({ creatorId, opponentUsername, quizTitle }) => {
            if (creatorId === user.id) {
                showError(`${opponentUsername} declined your challenge for "${quizTitle}"`);
                fetchChallenges(); // Refresh the list
            }
        });

        // Listen for new challenge notifications (when someone challenges you)
        socket.on('challenge_received', ({ challengeId, opponentId, creatorUsername, quizTitle }) => {
            // Only show notification if this user is the opponent
            if (opponentId === user.id) {
                showSuccess(`🎯 ${creatorUsername} challenged you to "${quizTitle}"!`);
                fetchChallenges(); // Refresh the list to show new challenge
            }
        });

        // Listen for challenge cancelled notifications
        socket.on('challenge_cancelled', ({ challengeId, opponentId }) => {
            // Only refresh if this user is the opponent
            if (opponentId === user.id) {
                fetchChallenges(); // Refresh the list to remove cancelled challenge
            }
        });

        // Listen for challenge accepted notifications
        socket.on('challenge_accepted', ({ challengeId, creatorId, opponentUsername }) => {
            // Only show notification and refresh if this user is the creator
            if (creatorId === user.id) {
                showSuccess(`🎮 ${opponentUsername} accepted your challenge!`);
                fetchChallenges(); // Refresh the list to move to active tab
            }
        });

        // Listen for opponent joining lobby
        socket.on('opponent_joined_lobby', ({ challengeId, joinedUserId, joinedUsername, targetUserId }) => {
            // Only show notification if this user is the target opponent
            if (targetUserId === user.id) {
                showSuccess(`🎮 ${joinedUsername} joined the lobby! Get ready!`);
                // Optional: Refresh challenges to show "In Lobby" status if we had that in the UI
                fetchChallenges();
            }
        });

        return () => {
            socket.close();
        };
    }, [activeTab, user.id]); // Added user.id to refresh on mount

    const fetchChallenges = async () => {
        try {
            setLoading(true);
            const statusFilter = activeTab === 'pending' ? 'pending' :
                activeTab === 'active' ? 'active' : 'completed';

            const response = await fetchWithAuth(
                `${API_URL}/api/challenges/my-challenges?status=${statusFilter}`
            );

            if (!response.ok) throw new Error('Failed to fetch challenges');

            const data = await response.json();
            // Filter out declined and cancelled challenges on frontend as well
            const filteredChallenges = (data.challenges || []).filter(
                c => c.status !== 'declined' && c.status !== 'cancelled'
            );
            setChallenges(filteredChallenges);
        } catch (err) {
            showError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await fetchWithAuth(`${API_URL}/api/challenges/stats/${user.id}`);
            if (response.ok) {
                const data = await response.json();
                setStats(data.stats);
            }
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        }
    };

    const handleAcceptChallenge = async (challengeId) => {
        try {
            const response = await fetchWithAuth(`${API_URL}/api/challenges/${challengeId}/accept`, {
                method: 'POST'
            });

            if (!response.ok) throw new Error('Failed to accept challenge');

            showSuccess('Challenge accepted! Ready to play!');
            setActiveTab('active'); // Switch to active tab
            fetchChallenges();
        } catch (err) {
            showError(err.message);
        }
    };


    const handleDeclineChallenge = async (challengeId) => {
        try {
            const response = await fetchWithAuth(`${API_URL}/api/challenges/${challengeId}/decline`, {
                method: 'POST'
            });

            if (!response.ok) throw new Error('Failed to decline challenge');

            showSuccess('Challenge declined');
            fetchChallenges();
        } catch (err) {
            showError(err.message);
        }
    };

    const handleCancelChallenge = async (challengeId) => {
        try {
            const response = await fetchWithAuth(`${API_URL}/api/challenges/${challengeId}/cancel`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to cancel challenge');

            showSuccess('Challenge cancelled');
            fetchChallenges();
        } catch (err) {
            showError(err.message);
        }
    };

    const renderStats = () => {
        if (!stats) return null;

        const winRate = stats.total_challenges > 0
            ? Math.round((stats.challenges_won / stats.total_challenges) * 100)
            : 0;

        return (
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem'
            }}>
                <div style={{
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    borderRadius: '12px',
                    padding: '1rem',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#6366f1' }}>
                        {stats.total_challenges}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Total Challenges
                    </div>
                </div>

                <div style={{
                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1))',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: '12px',
                    padding: '1rem',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#22c55e' }}>
                        {stats.challenges_won}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Wins
                    </div>
                </div>

                <div style={{
                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.1))',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '12px',
                    padding: '1rem',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ef4444' }}>
                        {stats.challenges_lost}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Losses
                    </div>
                </div>

                <div style={{
                    background: 'linear-gradient(135deg, rgba(100, 116, 139, 0.1), rgba(71, 85, 105, 0.1))',
                    border: '1px solid rgba(100, 116, 139, 0.3)',
                    borderRadius: '12px',
                    padding: '1rem',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#64748b' }}>
                        {stats.challenges_drawn}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Draws
                    </div>
                </div>

                <div style={{
                    background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.1), rgba(249, 115, 22, 0.1))',
                    border: '1px solid rgba(251, 146, 60, 0.3)',
                    borderRadius: '12px',
                    padding: '1rem',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fb923c' }}>
                        {winRate}%
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Win Rate
                    </div>
                </div>

                <div style={{
                    background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(147, 51, 234, 0.1))',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    borderRadius: '12px',
                    padding: '1rem',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#a855f7' }}>
                        {stats.current_win_streak}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Win Streak 🔥
                    </div>
                </div>
            </div>
        );
    };

    const renderChallengeCard = (challenge) => {
        const isPending = challenge.status === 'pending';
        const isActive = challenge.status === 'active';
        const isCompleted = challenge.status === 'completed';
        const isCreator = challenge.creator_id === user.id;
        const isWinner = challenge.winner_id === user.id;

        return (
            <div
                key={challenge.id}
                className="hover-lift"
                style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    border: '1px solid var(--glass-border)',
                    position: 'relative'
                }}
            >
                {/* Status Badge */}
                <div style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    background: isPending ? 'rgba(251, 146, 60, 0.2)' :
                        isActive ? 'rgba(34, 197, 94, 0.2)' :
                            isWinner ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    border: isPending ? '1px solid rgba(251, 146, 60, 0.3)' :
                        isActive ? '1px solid rgba(34, 197, 94, 0.3)' :
                            isWinner ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                    color: isPending ? '#fb923c' :
                        isActive ? '#22c55e' :
                            isWinner ? '#22c55e' : '#ef4444'
                }}>
                    {isPending ? '⏳ Pending' :
                        isActive ? '⚡ Active' :
                            isWinner ? '🏆 Won' :
                                challenge.winner_id ? '😔 Lost' : '🤝 Draw'}
                </div>

                {/* Quiz Info */}
                <h3 style={{ margin: '0 0 0.5rem 0', paddingRight: '6rem' }}>
                    {challenge.quiz_title}
                </h3>

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <span style={{
                        background: 'rgba(99, 102, 241, 0.2)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        color: '#a5b4fc',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                    }}>
                        {challenge.quiz_category}
                    </span>
                    <span style={{
                        background: 'rgba(251, 146, 60, 0.2)',
                        border: '1px solid rgba(251, 146, 60, 0.3)',
                        color: '#fb923c',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                    }}>
                        {challenge.quiz_difficulty}
                    </span>
                </div>

                {/* Opponent Info */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '1rem',
                    color: 'var(--text-muted)',
                    fontSize: '0.9rem'
                }}>
                    <span>⚔️</span>
                    <span>
                        {isCreator ? `vs ${challenge.opponent_username}` : `from ${challenge.creator_username}`}
                    </span>
                </div>

                {/* Scores (for completed challenges) */}
                {isCompleted && (
                    <div style={{
                        display: 'flex',
                        gap: '1rem',
                        marginBottom: '1rem',
                        padding: '1rem',
                        background: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '8px'
                    }}>
                        <div style={{ flex: 1, textAlign: 'center' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: isWinner ? '#22c55e' : '#ef4444' }}>
                                {challenge.my_score}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>You</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
                            VS
                        </div>
                        <div style={{ flex: 1, textAlign: 'center' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: isWinner ? '#ef4444' : '#22c55e' }}>
                                {challenge.opponent_score}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {challenge.opponent_username}
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {isPending && !isCreator && (
                        <>
                            <button
                                onClick={() => handleAcceptChallenge(challenge.id)}
                                style={{
                                    flex: 1,
                                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                                    border: 'none',
                                    color: 'white',
                                    padding: '0.75rem',
                                    fontSize: '0.95rem',
                                    cursor: 'pointer',
                                    borderRadius: '8px',
                                    fontWeight: '600'
                                }}
                            >
                                ✅ Accept Challenge
                            </button>
                            <button
                                onClick={() => handleDeclineChallenge(challenge.id)}
                                style={{
                                    flex: 1,
                                    background: 'rgba(239, 68, 68, 0.2)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    color: '#ef4444',
                                    padding: '0.75rem',
                                    fontSize: '0.95rem',
                                    cursor: 'pointer',
                                    borderRadius: '8px',
                                    fontWeight: '600'
                                }}
                            >
                                ❌ Decline
                            </button>
                        </>
                    )}

                    {isPending && isCreator && (
                        <button
                            onClick={() => handleCancelChallenge(challenge.id)}
                            style={{
                                flex: 1,
                                background: 'rgba(239, 68, 68, 0.2)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#ef4444',
                                padding: '0.75rem',
                                fontSize: '0.95rem',
                                cursor: 'pointer',
                                borderRadius: '8px',
                                fontWeight: '600'
                            }}
                        >
                            🗑️ Cancel Challenge
                        </button>
                    )}

                    {isActive && (
                        <button
                            onClick={() => onStartChallenge(challenge.id, challenge.quiz_id)}
                            style={{
                                flex: 1,
                                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                                border: 'none',
                                color: 'white',
                                padding: '0.75rem',
                                fontSize: '0.95rem',
                                cursor: 'pointer',
                                borderRadius: '8px',
                                fontWeight: '600',
                                animation: 'pulse 2s infinite'
                            }}
                        >
                            🎮 Join Now!
                        </button>
                    )}

                    {isCompleted && (
                        <>
                            <button
                                onClick={() => onViewResults(challenge.id)}
                                style={{
                                    flex: 1,
                                    background: 'rgba(99, 102, 241, 0.2)',
                                    border: '1px solid rgba(99, 102, 241, 0.3)',
                                    color: '#a5b4fc',
                                    padding: '0.75rem',
                                    fontSize: '0.95rem',
                                    cursor: 'pointer',
                                    borderRadius: '8px',
                                    fontWeight: '600'
                                }}
                            >
                                📊 View Details
                            </button>
                        </>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div style={{ maxWidth: '1200px', width: '100%' }}>
            <div className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ margin: 0 }}>⚔️ 1v1 Challenges</h2>
                    <button
                        onClick={onCreateChallenge}
                        style={{
                            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                            border: 'none',
                            color: 'white',
                            padding: '0.75rem 1.5rem',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            borderRadius: '8px',
                            fontWeight: '600'
                        }}
                    >
                        ➕ Create Challenge
                    </button>
                </div>

                {/* Stats Section */}
                {renderStats()}

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    gap: '1rem',
                    marginBottom: '2rem',
                    borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
                    paddingBottom: '1rem'
                }}>
                    {['pending', 'active', 'completed'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                background: activeTab === tab ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                                border: activeTab === tab ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                                color: activeTab === tab ? '#a5b4fc' : 'var(--text-muted)',
                                padding: '0.5rem 1rem',
                                fontSize: '0.95rem',
                                cursor: 'pointer',
                                borderRadius: '8px',
                                fontWeight: '600',
                                transition: 'all 0.2s'
                            }}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Challenges List */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        Loading challenges...
                    </div>
                ) : challenges.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                            {activeTab === 'pending' ? '📬' : activeTab === 'active' ? '⚡' : '📊'}
                        </div>
                        <h3>No {activeTab} challenges</h3>
                        <p>
                            {activeTab === 'pending' ? 'Create a challenge to get started!' :
                                activeTab === 'active' ? 'Accept a challenge to start playing!' :
                                    'Complete some challenges to see your history!'}
                        </p>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                        gap: '1.5rem'
                    }}>
                        {challenges.map(renderChallengeCard)}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChallengeHub;
