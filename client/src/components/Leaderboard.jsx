import React from 'react';
import { useAuth } from '../context/AuthContext';
import API_URL from '../config';
import { formatDate } from '../utils/dateUtils';

const Leaderboard = ({ onBack }) => {
    const { token } = useAuth();
    const [scores, setScores] = React.useState([]);
    const [filter, setFilter] = React.useState('first'); // 'first' or 'all'
    const [myQuizzesOnly, setMyQuizzesOnly] = React.useState(false);
    const [page, setPage] = React.useState(1);
    const [totalPages, setTotalPages] = React.useState(1);
    const [search, setSearch] = React.useState({
        player: '',
        quiz: '',
        attempt: ''
    });

    // Debounce search
    const [debouncedSearch, setDebouncedSearch] = React.useState(search);

    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1); // Reset to page 1 on search change
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    React.useEffect(() => {
        const queryParams = new URLSearchParams({
            filter,
            page,
            limit: 10,
            player: debouncedSearch.player,
            quiz: debouncedSearch.quiz,
            attempt: debouncedSearch.attempt,
            myQuizzesOnly
        });

        fetch(`${API_URL}/api/leaderboard?${queryParams}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
            .then(res => res.json())
            .then(data => {
                if (data.meta) {
                    setScores(data.data);
                    setTotalPages(data.meta.totalPages);
                } else {
                    // Fallback for old API if needed (though we updated it)
                    setScores(data);
                }
            })
            .catch(err => console.error(err));
    }, [filter, page, debouncedSearch, myQuizzesOnly, token]);

    const handleSearchChange = (field, value) => {
        setSearch(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="glass-card" style={{ maxWidth: '900px', width: '100%' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                borderBottom: '1px solid var(--glass-border)',
                paddingBottom: '1rem',
                flexWrap: 'wrap',
                gap: '1rem'
            }}>
                <h2 style={{ margin: 0 }}>Master Leaderboard</h2>

                <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                    alignItems: 'center'
                }}>
                    {/* My Quizzes Toggle */}
                    <button
                        onClick={() => { setMyQuizzesOnly(!myQuizzesOnly); setPage(1); }}
                        style={{
                            padding: '0.5rem 1.2rem',
                            borderRadius: '10px',
                            border: '1px solid var(--glass-border)',
                            background: myQuizzesOnly
                                ? 'linear-gradient(135deg, var(--primary), var(--secondary))'
                                : 'rgba(255, 255, 255, 0.05)',
                            color: myQuizzesOnly ? 'white' : 'var(--text-muted)',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: myQuizzesOnly ? '600' : '400',
                            transition: 'all 0.3s ease',
                            marginRight: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        {myQuizzesOnly ? '✓' : ''} Participated Only
                    </button>

                    <div style={{
                        display: 'flex',
                        gap: '0.5rem',
                        background: 'rgba(0,0,0,0.3)',
                        padding: '0.25rem',
                        borderRadius: '12px',
                        border: '1px solid var(--glass-border)'
                    }}>
                        <button
                            onClick={() => { setFilter('first'); setPage(1); }}
                            style={{
                                padding: '0.5rem 1.2rem',
                                borderRadius: '10px',
                                border: 'none',
                                background: filter === 'first'
                                    ? 'linear-gradient(135deg, var(--primary), var(--secondary))'
                                    : 'transparent',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: filter === 'first' ? '600' : '400',
                                transition: 'all 0.3s ease',
                                opacity: filter === 'first' ? 1 : 0.6
                            }}
                        >
                            First Attempt
                        </button>
                        <button
                            onClick={() => { setFilter('all'); setPage(1); }}
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
            </div>

            {/* Search Inputs */}
            <div style={{
                display: 'flex',
                gap: '1rem',
                marginBottom: '1.5rem',
                flexWrap: 'wrap'
            }}>
                <input
                    type="text"
                    placeholder="Search Player..."
                    value={search.player}
                    onChange={(e) => handleSearchChange('player', e.target.value)}
                    style={{
                        padding: '0.8rem',
                        borderRadius: '8px',
                        border: '1px solid var(--glass-border)',
                        background: 'rgba(255,255,255,0.05)',
                        color: 'white',
                        flex: 1,
                        minWidth: '200px'
                    }}
                />
                <input
                    type="text"
                    placeholder="Search Quiz..."
                    value={search.quiz}
                    onChange={(e) => handleSearchChange('quiz', e.target.value)}
                    style={{
                        padding: '0.8rem',
                        borderRadius: '8px',
                        border: '1px solid var(--glass-border)',
                        background: 'rgba(255,255,255,0.05)',
                        color: 'white',
                        flex: 1,
                        minWidth: '200px'
                    }}
                />
                {filter === 'all' && (
                    <input
                        type="number"
                        placeholder="Attempt #"
                        value={search.attempt}
                        onChange={(e) => handleSearchChange('attempt', e.target.value)}
                        style={{
                            padding: '0.8rem',
                            borderRadius: '8px',
                            border: '1px solid var(--glass-border)',
                            background: 'rgba(255,255,255,0.05)',
                            color: 'white',
                            width: '120px'
                        }}
                    />
                )}
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
                                        background: (page - 1) * 10 + idx < 3 ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                                        color: (page - 1) * 10 + idx < 3 ? 'black' : 'white',
                                        fontWeight: 'bold',
                                        fontSize: '0.8rem'
                                    }}>
                                        {(page - 1) * 10 + idx + 1}
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
                                <td style={{ padding: '1rem', textAlign: 'left', fontSize: '0.9rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                    {formatDate(entry.completed_at)}
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.1rem' }}>
                                    {entry.percentage}%
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {scores.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No scores found.
                </div>
            )}

            {/* Pagination Controls */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '1rem',
                marginTop: '2rem'
            }}>
                <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        border: '1px solid var(--glass-border)',
                        background: 'rgba(255,255,255,0.05)',
                        color: 'white',
                        cursor: page === 1 ? 'not-allowed' : 'pointer',
                        opacity: page === 1 ? 0.5 : 1
                    }}
                >
                    Previous
                </button>
                <span style={{ color: 'var(--text-muted)' }}>
                    Page {page} of {totalPages || 1}
                </span>
                <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        border: '1px solid var(--glass-border)',
                        background: 'rgba(255,255,255,0.05)',
                        color: 'white',
                        cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                        opacity: page >= totalPages ? 0.5 : 1
                    }}
                >
                    Next
                </button>
            </div>

            <button onClick={onBack} style={{ marginTop: '2rem' }}>Back to Menu</button>
        </div>
    );
};

export default Leaderboard;
