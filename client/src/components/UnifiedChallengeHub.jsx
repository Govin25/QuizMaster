import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import API_URL from '../config';
import { handleConcurrencyError } from '../utils/concurrencyHandler';

const UnifiedChallengeHub = ({
    // 1v1 Challenge callbacks
    onStartChallenge,
    onViewResults,
    onCreateChallenge,
    // Group Challenge callbacks
    onJoinRoom,
    onCreateRoom,
    onShowGroupResults
}) => {
    const { user, fetchWithAuth } = useAuth();
    const { showSuccess, showError } = useToast();

    // Mode: '1v1' or 'group'
    const [challengeMode, setChallengeMode] = useState(() => {
        const storedMode = window.__challengeHubMode;
        delete window.__challengeHubMode;
        return storedMode || '1v1';
    });

    // Sub-tabs for challenges
    const [activeTab, setActiveTab] = useState(() => {
        const storedTab = window.__challengeHubActiveTab;
        delete window.__challengeHubActiveTab;
        return storedTab || 'pending';
    });

    // 1v1 Challenge state
    const [challenges, setChallenges] = useState([]);
    const [challengeStats, setChallengeStats] = useState(null);
    const [hasActiveNotification, setHasActiveNotification] = useState(false);

    // Group Challenge state
    const [rooms, setRooms] = useState([]);
    const [groupStats, setGroupStats] = useState(null);
    const [roomCode, setRoomCode] = useState('');
    const [joiningByCode, setJoiningByCode] = useState(false);

    const [loading, setLoading] = useState(true);

    // Socket connection for real-time updates
    useEffect(() => {
        const socket = io(API_URL);

        socket.on('connect', () => {
            if (user && user.id) {
                socket.emit('join_user_room', { userId: user.id });
            }
        });

        // 1v1 Challenge socket events
        socket.on('challenge_declined', ({ creatorId }) => {
            if (String(creatorId) === String(user.id)) {
                fetchChallenges();
            }
        });

        socket.on('challenge_received', ({ opponentId }) => {
            if (String(opponentId) === String(user.id)) {
                fetchChallenges();
            }
        });

        socket.on('challenge_cancelled', ({ opponentId }) => {
            if (String(opponentId) === String(user.id)) {
                fetchChallenges();
            }
        });

        socket.on('challenge_accepted', ({ creatorId }) => {
            if (String(creatorId) === String(user.id)) {
                fetchChallenges();
                if (activeTab !== 'active') {
                    setHasActiveNotification(true);
                }
            }
        });

        socket.on('opponent_joined_lobby', ({ targetUserId }) => {
            if (String(targetUserId) === String(user.id)) {
                fetchChallenges();
            }
        });

        return () => {
            socket.close();
        };
    }, [activeTab, user.id]);

    // Fetch data based on mode
    useEffect(() => {
        if (challengeMode === '1v1') {
            fetchChallenges();
            fetchChallengeStats();
            checkActiveChallenges();
        } else {
            fetchRooms();
            fetchGroupStats();
        }
    }, [challengeMode, activeTab]);

    // =============== 1v1 CHALLENGE FUNCTIONS ===============

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

    const fetchChallengeStats = async () => {
        try {
            const response = await fetchWithAuth(`${API_URL}/api/challenges/stats/${user.id}`);
            if (response.ok) {
                const data = await response.json();
                setChallengeStats(data.stats);
            }
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        }
    };

    const checkActiveChallenges = async () => {
        try {
            const response = await fetchWithAuth(
                `${API_URL}/api/challenges/my-challenges?status=active&limit=1`
            );

            if (response.ok) {
                const data = await response.json();
                const activeChallenges = (data.challenges || []).filter(
                    c => c.status === 'active'
                );
                if (activeChallenges.length > 0 && activeTab !== 'active') {
                    setHasActiveNotification(true);
                }
            }
        } catch (err) {
            console.error('Failed to check active challenges:', err);
        }
    };

    const handleAcceptChallenge = async (challengeId) => {
        try {
            const challenge = challenges.find(c => c.id === challengeId);
            const version = challenge?.version;

            const response = await fetchWithAuth(`${API_URL}/api/challenges/${challengeId}/accept`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ version })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                if (await handleConcurrencyError(errorData, 'challenge', fetchChallenges, showSuccess)) {
                    return;
                }
                throw new Error('Failed to accept challenge');
            }

            showSuccess('Challenge accepted! Ready to play!');
            setActiveTab('active');
            setHasActiveNotification(false);
            fetchChallenges();
        } catch (err) {
            showError(err.message);
        }
    };

    const handleDeclineChallenge = async (challengeId) => {
        try {
            const challenge = challenges.find(c => c.id === challengeId);
            const version = challenge?.version;

            const response = await fetchWithAuth(`${API_URL}/api/challenges/${challengeId}/decline`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ version })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                if (await handleConcurrencyError(errorData, 'challenge', fetchChallenges, showSuccess)) {
                    return;
                }
                throw new Error('Failed to decline challenge');
            }

            showSuccess('Challenge declined');
            fetchChallenges();
        } catch (err) {
            showError(err.message);
        }
    };

    const handleCancelChallenge = async (challengeId) => {
        try {
            const challenge = challenges.find(c => c.id === challengeId);
            const version = challenge?.version;

            const response = await fetchWithAuth(`${API_URL}/api/challenges/${challengeId}/cancel`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ version })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                if (await handleConcurrencyError(errorData, 'challenge', fetchChallenges, showSuccess)) {
                    return;
                }
                throw new Error('Failed to cancel challenge');
            }

            showSuccess('Challenge cancelled');
            fetchChallenges();
        } catch (err) {
            showError(err.message);
        }
    };

    // =============== GROUP CHALLENGE FUNCTIONS ===============

    const fetchRooms = async () => {
        try {
            setLoading(true);
            const statusFilter = activeTab === 'completed' ? 'completed' : 'waiting,active';

            const response = await fetchWithAuth(
                `${API_URL}/api/group-challenges/my-rooms?status=${statusFilter}`
            );

            if (!response.ok) throw new Error('Failed to fetch rooms');

            const data = await response.json();
            setRooms(data.rooms || []);
        } catch (err) {
            showError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchGroupStats = async () => {
        try {
            const response = await fetchWithAuth(`${API_URL}/api/group-challenges/stats/${user.id}`);
            if (response.ok) {
                const data = await response.json();
                setGroupStats(data.stats);
            }
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        }
    };

    const handleJoinByCode = async () => {
        if (!roomCode || roomCode.trim().length !== 6) {
            showError('Please enter a valid 6-character room code');
            return;
        }

        try {
            setJoiningByCode(true);
            const response = await fetchWithAuth(`${API_URL}/api/group-challenges/join-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomCode: roomCode.toUpperCase() })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to join room');
            }

            const data = await response.json();
            showSuccess(`Joined room successfully!`);
            onJoinRoom(data.room.id, data.room.quiz_id);
        } catch (err) {
            showError(err.message);
        } finally {
            setJoiningByCode(false);
        }
    };

    // =============== RENDER FUNCTIONS ===============

    const render1v1Stats = () => {
        if (!challengeStats) return null;

        const winRate = challengeStats.total_challenges > 0
            ? Math.round((challengeStats.challenges_won / challengeStats.total_challenges) * 100)
            : 0;

        return (
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '0.75rem',
                marginBottom: '1.5rem'
            }}>
                <StatCard value={challengeStats.total_challenges} label="Total" color="#6366f1" />
                <StatCard value={challengeStats.challenges_won} label="Wins" color="#22c55e" />
                <StatCard value={challengeStats.challenges_lost} label="Losses" color="#ef4444" />
                <StatCard value={challengeStats.challenges_drawn} label="Draws" color="#64748b" />
                <StatCard value={`${winRate}%`} label="Win Rate" color="#fb923c" />
                <StatCard value={challengeStats.current_win_streak} label="Streak 🔥" color="#a855f7" />
            </div>
        );
    };

    const renderGroupStats = () => {
        if (!groupStats) return null;

        const podiumRate = groupStats.total_group_challenges > 0
            ? Math.round(((groupStats.first_place_finishes + groupStats.second_place_finishes + groupStats.third_place_finishes) / groupStats.total_group_challenges) * 100)
            : 0;

        return (
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '0.75rem',
                marginBottom: '1.5rem'
            }}>
                <StatCard value={groupStats.total_group_challenges} label="Total" color="#6366f1" />
                <StatCard value={groupStats.first_place_finishes} label="🥇 1st" color="#fbbf24" />
                <StatCard value={groupStats.second_place_finishes} label="🥈 2nd" color="#c0c0c0" />
                <StatCard value={groupStats.third_place_finishes} label="🥉 3rd" color="#cd7f32" />
                <StatCard value={groupStats.best_rank || '-'} label="Best Rank" color="#a855f7" />
                <StatCard value={`${podiumRate}%`} label="Podium Rate" color="#22c55e" />
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

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
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
                                {isCreator ? challenge.opponent_username : challenge.creator_username}
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
                                ✅ Accept
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
                        <button
                            onClick={() => onViewResults(challenge.id, () => {
                                window.__challengeHubActiveTab = 'completed';
                                window.__challengeHubMode = '1v1';
                            })}
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
                    )}
                </div>
            </div>
        );
    };

    const renderRoomCard = (room) => {
        const isWaiting = room.status === 'waiting';
        const isActive = room.status === 'active';
        const isCompleted = room.status === 'completed';
        const isLeader = room.leader_id === user.id;

        return (
            <div
                key={room.id}
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
                    background: isWaiting ? 'rgba(251, 146, 60, 0.2)' :
                        isActive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                    border: isWaiting ? '1px solid rgba(251, 146, 60, 0.3)' :
                        isActive ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(99, 102, 241, 0.3)',
                    color: isWaiting ? '#fb923c' : isActive ? '#22c55e' : '#a5b4fc'
                }}>
                    {isWaiting ? '⏳ Waiting' : isActive ? '⚡ Active' : '✅ Completed'}
                </div>

                {/* Quiz Info */}
                <h3 style={{ margin: '0 0 0.5rem 0', paddingRight: '6rem' }}>
                    {room.quiz_title}
                </h3>

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    <span style={{
                        background: 'rgba(99, 102, 241, 0.2)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        color: '#a5b4fc',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                    }}>
                        {room.quiz_category}
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
                        {room.quiz_difficulty}
                    </span>
                </div>

                {/* Room Info */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    marginBottom: '1rem',
                    color: 'var(--text-muted)',
                    fontSize: '0.9rem'
                }}>
                    <span>👥 {room.participant_count || 0}/{room.max_participants || 8} players</span>
                    {isLeader && <span style={{ color: '#fbbf24' }}>👑 Leader</span>}
                </div>

                {/* Rank (for completed) */}
                {isCompleted && room.my_rank && (
                    <div style={{
                        padding: '1rem',
                        background: room.my_rank === 1 ? 'rgba(251, 191, 36, 0.1)' :
                            room.my_rank === 2 ? 'rgba(192, 192, 192, 0.1)' :
                                room.my_rank === 3 ? 'rgba(205, 127, 50, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                        borderRadius: '8px',
                        marginBottom: '1rem',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                            {room.my_rank === 1 ? '🥇' : room.my_rank === 2 ? '🥈' : room.my_rank === 3 ? '🥉' : `#${room.my_rank}`}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                <span>👥 {room.participants?.length || room.participant_count || 0}/{room.max_participants} Players</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                <span>🎯 {room.question_count || room.quiz_question_count || 0} Questions</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <button
                    onClick={() => {
                        if (isCompleted || (isActive && room.my_completed)) {
                            // Show results if room is completed OR if user has completed in an active room
                            onShowGroupResults(room.id, () => {
                                window.__challengeHubActiveTab = 'completed';
                                window.__challengeHubMode = 'group';
                            });
                        } else {
                            onJoinRoom(room.id, room.quiz_id);
                        }
                    }}
                    style={{
                        width: '100%',
                        background: (isWaiting || (isActive && !room.my_completed))
                            ? 'linear-gradient(135deg, var(--primary), var(--secondary))'
                            : 'rgba(99, 102, 241, 0.2)',
                        border: (isWaiting || (isActive && !room.my_completed))
                            ? 'none'
                            : '1px solid rgba(99, 102, 241, 0.3)',
                        color: 'white',
                        padding: '0.75rem',
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                        borderRadius: '8px',
                        fontWeight: '600',
                        animation: (isActive && !room.my_completed) ? 'pulse 2s infinite' : 'none'
                    }}
                >
                    {isWaiting ? '🚪 Enter Lobby' :
                        isActive && room.my_completed ? '⏳ Awaiting Results...' :
                            isActive ? '🎮 Join Game!' :
                                '📊 View Results'}
                </button>
            </div>
        );
    };

    // Get tabs based on mode
    const getTabs = () => {
        if (challengeMode === '1v1') {
            return ['pending', 'active', 'completed'];
        }
        return ['active', 'completed'];
    };

    // Reset tab when switching modes
    const handleModeChange = (mode) => {
        setChallengeMode(mode);
        // Reset to appropriate default tab for each mode
        if (mode === '1v1') {
            setActiveTab('pending');
        } else {
            setActiveTab('active');
        }
    };

    return (
        <div style={{ maxWidth: '1200px', width: '100%' }}>
            <div className="glass-card">
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1.5rem',
                    flexWrap: 'wrap',
                    gap: '1rem'
                }}>
                    <h2 style={{ margin: 0 }}>🎮 Challenge Hub</h2>
                    <button
                        onClick={() => challengeMode === '1v1' ? onCreateChallenge() : onCreateRoom()}
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
                        ➕ {challengeMode === '1v1' ? 'Create Challenge' : 'Create Room'}
                    </button>
                </div>

                {/* Primary Mode Tabs */}
                <div style={{
                    display: 'flex',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '0.25rem',
                    marginBottom: '1.5rem',
                    gap: '0.25rem'
                }}>
                    <button
                        onClick={() => handleModeChange('1v1')}
                        style={{
                            flex: 1,
                            background: challengeMode === '1v1'
                                ? 'linear-gradient(135deg, var(--primary), var(--secondary))'
                                : 'transparent',
                            border: 'none',
                            color: 'white',
                            padding: '0.75rem 1rem',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            borderRadius: '10px',
                            fontWeight: '600',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        ⚔️ 1v1 Battles
                    </button>
                    <button
                        onClick={() => handleModeChange('group')}
                        style={{
                            flex: 1,
                            background: challengeMode === 'group'
                                ? 'linear-gradient(135deg, var(--primary), var(--secondary))'
                                : 'transparent',
                            border: 'none',
                            color: 'white',
                            padding: '0.75rem 1rem',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            borderRadius: '10px',
                            fontWeight: '600',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        🎯 Group Challenges
                    </button>
                </div>

                {/* Stats Section */}
                {challengeMode === '1v1' ? render1v1Stats() : renderGroupStats()}

                {/* Join by Code (Group mode only) */}
                {challengeMode === 'group' && (
                    <div style={{
                        background: 'rgba(99, 102, 241, 0.05)',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        borderRadius: '12px',
                        padding: '1.25rem',
                        marginBottom: '1.5rem'
                    }}>
                        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>🔑 Join with Room Code</h3>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <input
                                type="text"
                                value={roomCode}
                                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                placeholder="Enter 6-digit code"
                                maxLength={6}
                                style={{
                                    flex: 1,
                                    minWidth: '180px',
                                    padding: '0.75rem',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontSize: '1rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em'
                                }}
                                onKeyPress={(e) => e.key === 'Enter' && roomCode && roomCode.trim().length === 6 && handleJoinByCode()}
                            />
                            <button
                                onClick={handleJoinByCode}
                                disabled={joiningByCode || !roomCode || roomCode.trim().length !== 6}
                                style={{
                                    background: roomCode && roomCode.trim().length === 6 && !joiningByCode
                                        ? 'linear-gradient(135deg, var(--primary), var(--secondary))'
                                        : 'rgba(100, 116, 139, 0.2)',
                                    border: 'none',
                                    color: 'white',
                                    padding: '0.75rem 1.5rem',
                                    fontSize: '1rem',
                                    cursor: roomCode && roomCode.trim().length === 6 && !joiningByCode ? 'pointer' : 'not-allowed',
                                    borderRadius: '8px',
                                    fontWeight: '600',
                                    opacity: roomCode && roomCode.trim().length === 6 && !joiningByCode ? 1 : 0.5
                                }}
                            >
                                {joiningByCode ? 'Joining...' : 'Join'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Sub-tabs */}
                <div style={{
                    display: 'flex',
                    gap: '0.75rem',
                    marginBottom: '1.5rem',
                    borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
                    paddingBottom: '0.75rem'
                }}>
                    {getTabs().map(tab => (
                        <button
                            key={tab}
                            onClick={() => {
                                setActiveTab(tab);
                                if (tab === 'active') setHasActiveNotification(false);
                            }}
                            style={{
                                background: activeTab === tab ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                                border: activeTab === tab ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                                color: activeTab === tab ? '#a5b4fc' : 'var(--text-muted)',
                                padding: '0.5rem 1rem',
                                fontSize: '0.95rem',
                                cursor: 'pointer',
                                borderRadius: '8px',
                                fontWeight: '600',
                                transition: 'all 0.2s',
                                position: 'relative'
                            }}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            {challengeMode === '1v1' && tab === 'active' && hasActiveNotification && (
                                <span style={{
                                    position: 'absolute',
                                    top: '-4px',
                                    right: '-4px',
                                    width: '10px',
                                    height: '10px',
                                    backgroundColor: '#ef4444',
                                    borderRadius: '50%',
                                    border: '2px solid #1e1e2e'
                                }} />
                            )}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        Loading...
                    </div>
                ) : (challengeMode === '1v1' ? challenges : rooms).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                            {activeTab === 'pending' ? '📬' : activeTab === 'active' ? '⚡' : '📊'}
                        </div>
                        <h3>No {activeTab} {challengeMode === '1v1' ? 'challenges' : 'rooms'}</h3>
                        <p>
                            {challengeMode === '1v1'
                                ? (activeTab === 'pending' ? 'Create a challenge to get started!' :
                                    activeTab === 'active' ? 'Accept a challenge to start playing!' :
                                        'Complete some challenges to see your history!')
                                : (activeTab === 'active' ? 'Create a room or join with a code to get started!' :
                                    'Complete some challenges to see your history!')}
                        </p>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: '1.5rem'
                    }}>
                        {challengeMode === '1v1'
                            ? challenges.map(renderChallengeCard)
                            : rooms.map(renderRoomCard)}
                    </div>
                )}
            </div>
        </div>
    );
};

// Helper component for stats
const StatCard = ({ value, label, color }) => (
    <div style={{
        background: `linear-gradient(135deg, ${color}15, ${color}10)`,
        border: `1px solid ${color}40`,
        borderRadius: '12px',
        padding: '0.75rem',
        textAlign: 'center'
    }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color }}>
            {value}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {label}
        </div>
    </div>
);

export default UnifiedChallengeHub;
