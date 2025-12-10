import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import API_URL from '../config';

const GroupChallengeHub = ({ onJoinRoom, onCreate }) => {
    const { user, fetchWithAuth } = useAuth();
    const { showSuccess, showError } = useToast();

    const [activeTab, setActiveTab] = useState('active');
    const [rooms, setRooms] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [roomCode, setRoomCode] = useState('');
    const [joiningByCode, setJoiningByCode] = useState(false);

    useEffect(() => {
        fetchRooms();
        fetchStats();
    }, [activeTab]);

    const fetchRooms = async () => {
        try {
            setLoading(true);
            const statusFilter = activeTab === 'active' ? 'waiting,active' : 'completed';

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

    const fetchStats = async () => {
        try {
            const response = await fetchWithAuth(`${API_URL}/api/group-challenges/stats/${user.id}`);
            if (response.ok) {
                const data = await response.json();
                setStats(data.stats);
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

    const renderStats = () => {
        if (!stats) return null;

        const podiumRate = stats.total_group_challenges > 0
            ? Math.round(((stats.first_place_finishes + stats.second_place_finishes + stats.third_place_finishes) / stats.total_group_challenges) * 100)
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
                        {stats.total_group_challenges}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Total Challenges
                    </div>
                </div>

                <div style={{
                    background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(245, 158, 11, 0.1))',
                    border: '1px solid rgba(251, 191, 36, 0.3)',
                    borderRadius: '12px',
                    padding: '1rem',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fbbf24' }}>
                        {stats.first_place_finishes}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        🥇 1st Place
                    </div>
                </div>

                <div style={{
                    background: 'linear-gradient(135deg, rgba(192, 192, 192, 0.1), rgba(156, 163, 175, 0.1))',
                    border: '1px solid rgba(192, 192, 192, 0.3)',
                    borderRadius: '12px',
                    padding: '1rem',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#c0c0c0' }}>
                        {stats.second_place_finishes}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        🥈 2nd Place
                    </div>
                </div>

                <div style={{
                    background: 'linear-gradient(135deg, rgba(205, 127, 50, 0.1), rgba(180, 100, 40, 0.1))',
                    border: '1px solid rgba(205, 127, 50, 0.3)',
                    borderRadius: '12px',
                    padding: '1rem',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#cd7f32' }}>
                        {stats.third_place_finishes}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        🥉 3rd Place
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
                        {stats.best_rank || '-'}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Best Rank
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
                        {podiumRate}%
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Podium Rate
                    </div>
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
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            Your Rank • Score: {room.my_score}
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <button
                    onClick={() => onJoinRoom(room.id, room.quiz_id)}
                    style={{
                        width: '100%',
                        background: isWaiting || isActive ? 'linear-gradient(135deg, var(--primary), var(--secondary))' : 'rgba(99, 102, 241, 0.2)',
                        border: isWaiting || isActive ? 'none' : '1px solid rgba(99, 102, 241, 0.3)',
                        color: 'white',
                        padding: '0.75rem',
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                        borderRadius: '8px',
                        fontWeight: '600',
                        animation: isActive ? 'pulse 2s infinite' : 'none'
                    }}
                >
                    {isWaiting ? '🚪 Enter Lobby' : isActive ? '🎮 Join Game!' : '📊 View Results'}
                </button>
            </div>
        );
    };

    return (
        <div style={{ maxWidth: '1200px', width: '100%' }}>
            <div className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <h2 style={{ margin: 0 }}>🎯 Group Challenges</h2>
                    <button
                        onClick={onCreate}
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
                        ➕ Create Room
                    </button>
                </div>

                {/* Stats Section */}
                {renderStats()}

                {/* Join by Code Section */}
                <div style={{
                    background: 'rgba(99, 102, 241, 0.05)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    marginBottom: '2rem'
                }}>
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>🔑 Join with Room Code</h3>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <input
                            type="text"
                            value={roomCode}
                            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                            placeholder="Enter 6-digit code"
                            maxLength={6}
                            style={{
                                flex: 1,
                                minWidth: '200px',
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
                            {joiningByCode ? 'Joining...' : 'Join Room'}
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    gap: '1rem',
                    marginBottom: '2rem',
                    borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
                    paddingBottom: '1rem'
                }}>
                    {['active', 'completed'].map(tab => (
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

                {/* Rooms List */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        Loading rooms...
                    </div>
                ) : rooms.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                            {activeTab === 'active' ? '🎮' : '📊'}
                        </div>
                        <h3>No {activeTab} rooms</h3>
                        <p>
                            {activeTab === 'active' ? 'Create a room or join with a code to get started!' : 'Complete some challenges to see your history!'}
                        </p>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                        gap: '1.5rem'
                    }}>
                        {rooms.map(renderRoomCard)}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GroupChallengeHub;
