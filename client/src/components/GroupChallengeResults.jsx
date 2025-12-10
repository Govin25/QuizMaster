import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import API_URL from '../config';

const GroupChallengeResults = ({ roomId, onClose, onViewQuiz }) => {
    const { user, fetchWithAuth } = useAuth();
    const [room, setRoom] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchResults();
    }, []);

    const fetchResults = async () => {
        try {
            const response = await fetchWithAuth(`${API_URL}/api/group-challenges/${roomId}`);
            if (!response.ok) throw new Error('Failed to fetch results');

            const data = await response.json();
            setRoom(data.room);
            setLoading(false);
        } catch (err) {
            console.error('Failed to fetch results:', err);
            onClose();
        }
    };

    if (loading || !room) {
        return <div className="glass-card"><h2>Loading results...</h2></div>;
    }

    const myParticipant = room.participants.find(p => p.user_id === user.id);
    const myRank = myParticipant?.rank || 0;
    const winner = room.participants.find(p => p.rank === 1);

    return (
        <div className="glass-card" style={{ maxWidth: '900px', width: '100%' }}>
            {/* Winner Celebration */}
            {myRank === 1 && (
                <div style={{
                    textAlign: 'center',
                    padding: '2rem',
                    background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.2))',
                    border: '2px solid rgba(251, 191, 36, 0.5)',
                    borderRadius: '16px',
                    marginBottom: '2rem',
                    animation: 'pulse 2s infinite'
                }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏆</div>
                    <h2 style={{ margin: '0 0 0.5rem 0', color: '#fbbf24' }}>Congratulations!</h2>
                    <p style={{ margin: 0, fontSize: '1.2rem' }}>You won the challenge!</p>
                </div>
            )}

            {myRank > 1 && (
                <div style={{
                    textAlign: 'center',
                    padding: '1.5rem',
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    borderRadius: '12px',
                    marginBottom: '2rem'
                }}>
                    <h2 style={{ margin: '0 0 0.5rem 0' }}>Challenge Complete!</h2>
                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                        {winner?.username} won the challenge!
                    </p>
                </div>
            )}

            {/* Podium (Top 3) */}
            {room.participants.length >= 3 && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-end',
                    gap: '1rem',
                    marginBottom: '2rem',
                    padding: '2rem 1rem'
                }}>
                    {/* 2nd Place */}
                    {room.participants.find(p => p.rank === 2) && (
                        <div style={{
                            flex: '0 0 150px',
                            textAlign: 'center',
                            animation: 'slideInLeft 0.5s ease-out'
                        }}>
                            <div style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #c0c0c0, #a8a8a8)',
                                margin: '0 auto 0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '2rem',
                                border: '3px solid #c0c0c0'
                            }}>
                                🥈
                            </div>
                            <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                                {room.participants.find(p => p.rank === 2).username}
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#c0c0c0' }}>
                                {room.participants.find(p => p.rank === 2).score}
                            </div>
                            <div style={{
                                height: '100px',
                                background: 'linear-gradient(135deg, rgba(192, 192, 192, 0.2), rgba(168, 168, 168, 0.2))',
                                border: '2px solid rgba(192, 192, 192, 0.5)',
                                borderRadius: '8px 8px 0 0',
                                marginTop: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '2rem',
                                fontWeight: 'bold',
                                color: '#c0c0c0'
                            }}>
                                2
                            </div>
                        </div>
                    )}

                    {/* 1st Place */}
                    {winner && (
                        <div style={{
                            flex: '0 0 180px',
                            textAlign: 'center',
                            animation: 'slideInUp 0.5s ease-out'
                        }}>
                            <div style={{
                                width: '100px',
                                height: '100px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                                margin: '0 auto 0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '3rem',
                                border: '4px solid #fbbf24',
                                boxShadow: '0 0 20px rgba(251, 191, 36, 0.5)'
                            }}>
                                🥇
                            </div>
                            <div style={{ fontWeight: '700', fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                                {winner.username}
                            </div>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fbbf24' }}>
                                {winner.score}
                            </div>
                            <div style={{
                                height: '140px',
                                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.3), rgba(245, 158, 11, 0.3))',
                                border: '3px solid rgba(251, 191, 36, 0.7)',
                                borderRadius: '8px 8px 0 0',
                                marginTop: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '2.5rem',
                                fontWeight: 'bold',
                                color: '#fbbf24'
                            }}>
                                1
                            </div>
                        </div>
                    )}

                    {/* 3rd Place */}
                    {room.participants.find(p => p.rank === 3) && (
                        <div style={{
                            flex: '0 0 150px',
                            textAlign: 'center',
                            animation: 'slideInRight 0.5s ease-out'
                        }}>
                            <div style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #cd7f32, #b86f28)',
                                margin: '0 auto 0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '2rem',
                                border: '3px solid #cd7f32'
                            }}>
                                🥉
                            </div>
                            <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                                {room.participants.find(p => p.rank === 3).username}
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#cd7f32' }}>
                                {room.participants.find(p => p.rank === 3).score}
                            </div>
                            <div style={{
                                height: '80px',
                                background: 'linear-gradient(135deg, rgba(205, 127, 50, 0.2), rgba(184, 111, 40, 0.2))',
                                border: '2px solid rgba(205, 127, 50, 0.5)',
                                borderRadius: '8px 8px 0 0',
                                marginTop: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '2rem',
                                fontWeight: 'bold',
                                color: '#cd7f32'
                            }}>
                                3
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Full Leaderboard */}
            <h3 style={{ marginBottom: '1rem' }}>📊 Final Standings</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                {room.participants.map((participant) => {
                    const isMe = participant.user_id === user.id;

                    return (
                        <div
                            key={participant.user_id}
                            style={{
                                background: isMe ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                border: isMe ? '2px solid rgba(99, 102, 241, 0.5)' : '1px solid var(--glass-border)',
                                borderRadius: '12px',
                                padding: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem'
                            }}
                        >
                            {/* Rank */}
                            <div style={{
                                fontSize: '1.5rem',
                                fontWeight: 'bold',
                                minWidth: '50px',
                                textAlign: 'center',
                                color: participant.rank === 1 ? '#fbbf24' :
                                    participant.rank === 2 ? '#c0c0c0' :
                                        participant.rank === 3 ? '#cd7f32' : 'var(--text-muted)'
                            }}>
                                {participant.rank === 1 ? '🥇' :
                                    participant.rank === 2 ? '🥈' :
                                        participant.rank === 3 ? '🥉' : `#${participant.rank}`}
                            </div>

                            {/* Player Info */}
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: '600', fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                                    {participant.username}{isMe && ' (You)'}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    Time: {Math.floor(participant.total_time_seconds / 60)}:{(participant.total_time_seconds % 60).toString().padStart(2, '0')}
                                </div>
                            </div>

                            {/* Score */}
                            <div style={{
                                fontSize: '2rem',
                                fontWeight: 'bold',
                                color: participant.rank === 1 ? '#fbbf24' :
                                    participant.rank === 2 ? '#c0c0c0' :
                                        participant.rank === 3 ? '#cd7f32' : 'white'
                            }}>
                                {participant.score}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {onViewQuiz && (
                    <button
                        onClick={() => onViewQuiz(room.quiz_id)}
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
                        📝 View Quiz
                    </button>
                )}
                <button
                    onClick={onClose}
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
                    🏠 Back to Hub
                </button>
            </div>
        </div>
    );
};

export default GroupChallengeResults;
