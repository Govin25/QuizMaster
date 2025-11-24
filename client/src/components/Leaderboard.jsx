import React from 'react';
import API_URL from '../config';

const Leaderboard = ({ onBack }) => {
    const [scores, setScores] = React.useState([]);
    const [filter, setFilter] = React.useState('best'); // 'best' or 'all'

    React.useEffect(() => {
        fetch(`${API_URL}/api/leaderboard?filter=${filter}`)
            .then(res => res.json())
            .then(data => setScores(data))
            .catch(err => console.error(err));
    }, [filter]);

    return (
        <div className="glass-card" style={{ maxWidth: '900px', width: '100%' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
                borderBottom: '1px solid var(--glass-border)',
                paddingBottom: '1rem',
                flexWrap: 'wrap',
                gap: '1rem'
            }}>
                <h2 style={{ margin: 0 }}>Leaderboard</h2>

                <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    background: 'rgba(0,0,0,0.3)',
                    padding: '0.25rem',
                    borderRadius: '12px',
                    border: '1px solid var(--glass-border)'
                }}>
                    <button
                        onClick={() => setFilter('best')}
                        style={{
                            padding: '0.5rem 1.2rem',
                            borderRadius: '10px',
                            border: 'none',
                            background: filter === 'best'
                                ? 'linear-gradient(135deg, var(--primary), var(--secondary))'
                                : 'transparent',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: filter === 'best' ? '600' : '400',
                            transition: 'all 0.3s ease',
                            opacity: filter === 'best' ? 1 : 0.6
                        }}
                    >
                        Best Scores
                    </button>
                    <button
                        onClick={() => setFilter('all')}
                        style={{
                            padding: '0.5rem 1.2rem',
                            borderRadius: '10px',
                            border: 'none',
                            background: filter === 'all'
                                ? 'linear-gradient(135deg, var(--primary), var(--secondary))'
                                : 'transparent',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: filter === 'all' ? '600' : '400',
                            transition: 'all 0.3s ease',
                            opacity: filter === 'all' ? 1 : 0.6
                        }}
                    >
                        All Attempts
                    </button>
                </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                            <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)' }}>Rank</th>
                            <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)' }}>Player</th>
                            <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)' }}>Quiz</th>
                            {filter === 'all' && (
                                <th style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>Attempt</th>
                            )}
                            <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)' }}>Date</th>
                            <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-muted)' }}>Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        {scores.map((entry, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '1rem', textAlign: 'left' }}>
                                    <span style={{
                                        display: 'inline-block',
                                        width: '24px',
                                        height: '24px',
                                        lineHeight: '24px',
                                        textAlign: 'center',
                                        borderRadius: '50%',
                                        background: idx < 3 ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                                        color: idx < 3 ? 'black' : 'white',
                                        fontWeight: 'bold',
                                        fontSize: '0.8rem'
                                    }}>
                                        {idx + 1}
                                    </span>
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'left', fontWeight: '500' }}>{entry.username}</td>
                                <td style={{ padding: '1rem', textAlign: 'left' }}>{entry.quizTitle}</td>
                                {filter === 'all' && (
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                        {entry.attemptNumber ? (
                                            <span style={{
                                                display: 'inline-block',
                                                padding: '0.25rem 0.6rem',
                                                borderRadius: '12px',
                                                background: 'rgba(139, 92, 246, 0.2)',
                                                color: 'var(--primary)',
                                                fontSize: '0.85rem',
                                                fontWeight: '600'
                                            }}>
                                                #{entry.attemptNumber}
                                            </span>
                                        ) : (
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>-</span>
                                        )}
                                    </td>
                                )}
                                <td style={{ padding: '1rem', textAlign: 'left', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                    {new Date(entry.completed_at).toLocaleDateString(undefined, {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.1rem' }}>{entry.score}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {scores.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No scores yet. Be the first to play!
                </div>
            )}

            <button onClick={onBack} style={{ marginTop: '2rem' }}>Back to Menu</button>
        </div>
    );
};

export default Leaderboard;
