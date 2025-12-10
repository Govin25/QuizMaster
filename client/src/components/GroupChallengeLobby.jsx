import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import API_URL from '../config';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const GroupChallengeLobby = ({ roomId, quizId, onStartGame, onBack }) => {
    const { user, fetchWithAuth } = useAuth();
    const { showSuccess, showError } = useToast();

    const [socket, setSocket] = useState(null);
    const [room, setRoom] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [isReady, setIsReady] = useState(false);
    const [countdown, setCountdown] = useState(null);
    const [loading, setLoading] = useState(true);
    const [challengeStarted, setChallengeStarted] = useState(false);

    const isLeader = room?.leader_id === user.id;
    const allReady = participants?.every(p => p.is_ready) && participants?.length >= 2;

    useEffect(() => {
        fetchRoomDetails();

        const newSocket = io(API_URL);
        setSocket(newSocket);

        newSocket.on('connect', () => {
            newSocket.emit('join_group_challenge_room', { roomId, userId: user.id, username: user.username });
        });

        newSocket.on('room_updated', ({ participants: updatedParticipants }) => {
            setParticipants(updatedParticipants);
            setRoom(prev => ({ ...prev, participants: updatedParticipants, participant_count: updatedParticipants.length }));
        });

        newSocket.on('participant_joined', ({ participant }) => {
            setParticipants(prev => {
                const exists = prev.find(p => p.user_id === participant.user_id);
                if (exists) return prev;
                showSuccess(`${participant.username} joined the room!`);
                return [...prev, participant];
            });
        });

        newSocket.on('participant_left', ({ userId: leftUserId, username }) => {
            setParticipants(prev => prev.filter(p => p.user_id !== leftUserId));
            showSuccess(`${username} left the room`);
        });

        newSocket.on('participant_ready_status', ({ userId: readyUserId, isReady: ready, username }) => {
            setParticipants(prev =>
                prev.map(p => p.user_id === readyUserId ? { ...p, is_ready: ready } : p)
            );
            if (readyUserId !== user.id) {
                showSuccess(`${username} is now ${ready ? 'ready' : 'not ready'}`);
            }
        });

        newSocket.on('group_challenge_start', () => {
            console.log('Challenge starting - transitioning to game');
            setChallengeStarted(true);
            onStartGame();
        });

        newSocket.on('room_deleted', () => {
            showError('Room was deleted by the leader');
            onBack();
        });

        return () => {
            newSocket.emit('leave_group_challenge_room', { userId: user.id, roomId });
            newSocket.close();
        };
    }, [roomId]);

    useEffect(() => {
        if (countdown === null) return;

        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const fetchRoomDetails = async () => {
        try {
            const response = await fetchWithAuth(`${API_URL}/api/group-challenges/${roomId}`);
            if (!response.ok) throw new Error('Failed to fetch room details');

            const data = await response.json();
            setRoom(data.room);
            setParticipants(data.room.participants);

            // Set initial ready status
            const me = data.room.participants.find(p => p.user_id === user.id);
            if (me) setIsReady(me.is_ready);

            setLoading(false);
        } catch (err) {
            showError(err.message);
            onBack();
        }
    };

    const handleToggleReady = async () => {
        try {
            const newReadyStatus = !isReady;

            // Optimistically update UI
            setIsReady(newReadyStatus);
            setParticipants(prev =>
                prev.map(p => p.user_id === user.id ? { ...p, is_ready: newReadyStatus } : p)
            );

            const response = await fetchWithAuth(`${API_URL}/api/group-challenges/${roomId}/ready`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isReady: newReadyStatus })
            });

            if (!response.ok) throw new Error('Failed to update ready status');

            setIsReady(newReadyStatus);
        } catch (err) {
            showError(err.message);
        }
    };

    const handleStart = async () => {
        try {
            const response = await fetchWithAuth(`${API_URL}/api/group-challenges/${roomId}/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to start challenge');
            }
        } catch (err) {
            showError(err.message);
        }
    };

    const handleLeaveRoom = async () => {
        try {
            await fetchWithAuth(`${API_URL}/api/group-challenges/${roomId}/leave`, {
                method: 'POST'
            });
            onBack();
        } catch (err) {
            showError(err.message);
        }
    };

    const copyRoomCode = () => {
        navigator.clipboard.writeText(room.room_code);
        showSuccess('Room code copied to clipboard!');
    };

    if (loading || !room) {
        return (
            <div className="glass-card" style={{ textAlign: 'center' }}>
                <h2>Loading lobby...</h2>
            </div>
        );
    }

    return (
        <div className="glass-card" style={{ maxWidth: '900px', width: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h2 style={{ margin: '0 0 0.5rem 0' }}>🎮 Challenge Lobby</h2>
                <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)' }}>{room.quiz_title}</h3>

                {/* Room Code */}
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'rgba(99, 102, 241, 0.2)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    borderRadius: '12px',
                    padding: '0.75rem 1.5rem',
                    cursor: 'pointer'
                }}
                    onClick={copyRoomCode}
                >
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Room Code:</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 'bold', letterSpacing: '0.2em', color: '#a5b4fc' }}>
                        {room.room_code}
                    </span>
                    <span style={{ fontSize: '1rem' }}>📋</span>
                </div>
            </div>

            {/* Countdown */}
            {countdown !== null && countdown >= 0 && (
                <div style={{
                    textAlign: 'center',
                    padding: '2rem',
                    background: 'rgba(34, 197, 94, 0.2)',
                    border: '2px solid rgba(34, 197, 94, 0.5)',
                    borderRadius: '16px',
                    marginBottom: '2rem',
                    animation: 'pulse 1s infinite'
                }}>
                    <div style={{ fontSize: '4rem', fontWeight: 'bold', color: '#22c55e', marginBottom: '0.5rem' }}>
                        {countdown > 0 ? countdown : '🚀'}
                    </div>
                    <div style={{ fontSize: '1.2rem', color: 'white' }}>
                        {countdown > 0 ? 'Starting in...' : 'Get Ready!'}
                    </div>
                </div>
            )}

            {/* Participants Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem'
            }}>
                {participants?.map(participant => (
                    <div
                        key={participant.user_id}
                        style={{
                            background: participant.is_ready ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                            border: participant.is_ready ? '2px solid rgba(34, 197, 94, 0.5)' : '1px solid var(--glass-border)',
                            borderRadius: '12px',
                            padding: '1rem',
                            textAlign: 'center',
                            position: 'relative',
                            transition: 'all 0.3s'
                        }}
                    >
                        {/* Ready Badge */}
                        {participant.is_ready && (
                            <div style={{
                                position: 'absolute',
                                top: '-8px',
                                right: '-8px',
                                width: '24px',
                                height: '24px',
                                background: '#22c55e',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.8rem',
                                animation: 'pulse 2s infinite'
                            }}>
                                ✓
                            </div>
                        )}

                        {/* Leader Crown */}
                        {participant.user_id === room.leader_id && (
                            <div style={{
                                position: 'absolute',
                                top: '-8px',
                                left: '-8px',
                                fontSize: '1.5rem'
                            }}>
                                👑
                            </div>
                        )}

                        {/* Avatar */}
                        <div style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                            margin: '0 auto 0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.5rem'
                        }}>
                            {participant.username.charAt(0).toUpperCase()}
                        </div>

                        {/* Username */}
                        <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                            {participant.username}
                            {participant.user_id === user.id && ' (You)'}
                        </div>

                        {/* Level */}
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Level {participant.level || 1}
                        </div>

                        {/* Status */}
                        <div style={{
                            marginTop: '0.5rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            color: participant.is_ready ? '#22c55e' : '#fb923c'
                        }}>
                            {participant.is_ready ? '✅ Ready' : '⏳ Not Ready'}
                        </div>
                    </div>
                ))}

                {/* Empty Slots */}
                {Array.from({ length: room.max_participants - room.participant_count }).map((_, idx) => (
                    <div
                        key={`empty-${idx}`}
                        style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px dashed rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            padding: '1rem',
                            textAlign: 'center',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: '150px'
                        }}
                    >
                        <div style={{ color: 'var(--text-muted)', fontSize: '2rem' }}>
                            👤
                        </div>
                    </div>
                ))}
            </div>

            {/* Status Message */}
            {!allReady && room.participant_count >= 2 && (
                <div style={{
                    textAlign: 'center',
                    padding: '1rem',
                    background: 'rgba(251, 146, 60, 0.1)',
                    border: '1px solid rgba(251, 146, 60, 0.3)',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    color: '#fb923c'
                }}>
                    ⏳ Waiting for all players to be ready...
                </div>
            )}

            {room.participant_count < 2 && (
                <div style={{
                    textAlign: 'center',
                    padding: '1rem',
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    color: '#a5b4fc'
                }}>
                    👥 Waiting for more players to join... (minimum 2 required)
                </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {!isLeader && (
                    <button
                        onClick={handleToggleReady}
                        disabled={challengeStarted}
                        style={{
                            flex: 1,
                            background: isReady ? 'rgba(239, 68, 68, 0.2)' : 'linear-gradient(135deg, var(--primary), var(--secondary))',
                            border: isReady ? '1px solid rgba(239, 68, 68, 0.3)' : 'none',
                            color: 'white',
                            padding: '0.75rem 1.5rem',
                            fontSize: '1rem',
                            cursor: challengeStarted ? 'not-allowed' : 'pointer',
                            borderRadius: '8px',
                            fontWeight: '600',
                            opacity: challengeStarted ? 0.5 : 1
                        }}
                    >
                        {isReady ? '❌ Not Ready' : '✅ Ready'}
                    </button>
                )}

                {isLeader && (
                    <button
                        onClick={handleStart}
                        disabled={!allReady || challengeStarted}
                        style={{
                            flex: 1,
                            background: allReady && !challengeStarted ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'rgba(100, 116, 139, 0.2)',
                            border: allReady && !challengeStarted ? 'none' : '1px solid rgba(100, 116, 139, 0.3)',
                            color: 'white',
                            padding: '1rem',
                            fontSize: '1rem',
                            cursor: allReady && !challengeStarted ? 'pointer' : 'not-allowed',
                            borderRadius: '8px',
                            fontWeight: '600',
                            opacity: allReady && !challengeStarted ? 1 : 0.5
                        }}
                    >
                        {allReady ? '🚀 Start Challenge!' : '⏳ Waiting for Players...'}
                    </button>
                )}

                <button
                    onClick={handleLeaveRoom}
                    disabled={challengeStarted}
                    style={{
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#ef4444',
                        padding: '1rem 1.5rem',
                        fontSize: '1rem',
                        cursor: challengeStarted ? 'not-allowed' : 'pointer',
                        borderRadius: '8px',
                        fontWeight: '600',
                        opacity: challengeStarted ? 0.5 : 1
                    }}
                >
                    🚪 Leave Room
                </button>
            </div>
        </div>
    );
};

export default GroupChallengeLobby;
