import React from 'react';
import { useAuth } from '../context/AuthContext';
import API_URL from '../config';
import { formatDate } from '../utils/dateUtils';

const Leaderboard = ({ onBack, onViewProfile }) => {
    const { fetchWithAuth } = useAuth();
    const [scores, setScores] = React.useState([]);
    const [filter, setFilter] = React.useState('first'); // 'first' or 'all'
    const [myQuizzesOnly, setMyQuizzesOnly] = React.useState(true); // Default to true for personalized view
    const [page, setPage] = React.useState(1);
    const [totalPages, setTotalPages] = React.useState(1);
    const [search, setSearch] = React.useState({
        player: '',
        quiz: '',
        attempt: ''
    });
    const [initialLoadDone, setInitialLoadDone] = React.useState(false);
    const [loading, setLoading] = React.useState(true); // Add loading state

    // Fetch user's most recent PUBLIC quiz on mount to pre-populate search
    // (Private quizzes don't appear in leaderboard)
    React.useEffect(() => {
        const fetchRecentQuiz = async () => {
            try {
                const response = await fetchWithAuth(`${API_URL}/api/quizzes/my-library`);
                if (response.ok) {
                    const data = await response.json();
                    // Find the most recent completed PUBLIC quiz
                    if (data.completed && data.completed.length > 0) {
                        const mostRecentPublic = data.completed.find(q => q.is_public === true);
                        if (mostRecentPublic) {
                            // Set both search and debouncedSearch together to prevent any lag
                            setSearch(prev => ({ ...prev, quiz: mostRecentPublic.title }));
                            setDebouncedSearch(prev => ({ ...prev, quiz: mostRecentPublic.title }));
                        }
                        // Mark as done whether or not we found a public quiz
                        setInitialLoadDone(true);
                    } else {
                        // No completed quizzes, just mark as done
                        setInitialLoadDone(true);
                    }
                } else {
                    setInitialLoadDone(true);
                }
            } catch (err) {
                console.error('Failed to fetch recent quiz:', err);
                setInitialLoadDone(true);
            }
        };
        fetchRecentQuiz();
    }, [fetchWithAuth]);

    // Debounce search
    const [debouncedSearch, setDebouncedSearch] = React.useState(search);

    React.useEffect(() => {
        // Skip debounce if we haven't done initial load yet
        if (!initialLoadDone) return;

        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1); // Reset to page 1 on search change
        }, 500);
        return () => clearTimeout(timer);
    }, [search, initialLoadDone]);

    React.useEffect(() => {
        // Don't fetch until initial load is done (to avoid double fetch)
        if (!initialLoadDone) return;

        setLoading(true); // Set loading when fetching

        const queryParams = new URLSearchParams({
            filter,
            page,
            limit: 10,
            player: debouncedSearch.player,
            quiz: debouncedSearch.quiz,
            attempt: debouncedSearch.attempt,
            myQuizzesOnly
        });

        fetchWithAuth(`${API_URL}/api/leaderboard?${queryParams}`)
            .then(res => res.json())
            .then(data => {
                if (data.meta) {
                    setScores(data.data);
                    setTotalPages(data.meta.totalPages);
                } else {
                    // Fallback for old API if needed (though we updated it)
                    setScores(data);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [filter, page, debouncedSearch, myQuizzesOnly, fetchWithAuth, initialLoadDone]);

    const handleSearchChange = (field, value) => {
        setSearch(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="glass-card" style={{ width: '100%' }}>
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

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Loading leaderboard...
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Rank</th>
                                <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Player</th>
                                <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Quiz</th>
                                <th style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Difficulty</th>
                                <th style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Score</th>
                                <th style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Time</th>
                                {filter === 'all' && (
                                    <th style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Attempt</th>
                                )}
                                <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {scores.map((entry, idx) => {
                                const rank = (page - 1) * 10 + idx + 1;
                                const isTop3 = rank <= 3;
                                const difficultyColors = {
                                    easy: { bg: 'rgba(34, 197, 94, 0.2)', color: '#22c55e' },
                                    medium: { bg: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' },
                                    hard: { bg: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }
                                };
                                const difficulty = entry.difficulty?.toLowerCase() || 'medium';
                                const diffStyle = difficultyColors[difficulty] || difficultyColors.medium;

                                // Format time
                                const formatTime = (seconds) => {
                                    if (!seconds) return '-';
                                    const mins = Math.floor(seconds / 60);
                                    const secs = seconds % 60;
                                    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
                                };

                                return (
                                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '0.75rem', textAlign: 'left' }}>
                                            <span style={{
                                                display: 'inline-block',
                                                width: '28px',
                                                height: '28px',
                                                lineHeight: '28px',
                                                textAlign: 'center',
                                                borderRadius: '50%',
                                                background: isTop3 ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                                                color: isTop3 ? 'black' : 'white',
                                                fontWeight: 'bold',
                                                fontSize: '0.8rem'
                                            }}>
                                                {rank}
                                            </span>
                                        </td>
                                        <td
                                            onClick={() => onViewProfile && onViewProfile(entry.user_id)}
                                            style={{
                                                padding: '0.75rem',
                                                textAlign: 'left',
                                                fontWeight: '500',
                                                cursor: onViewProfile ? 'pointer' : 'default',
                                                color: onViewProfile ? 'var(--primary)' : 'white',
                                            }}
                                        >
                                            {entry.username}
                                        </td>
                                        <td style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-muted)' }}>
                                            {entry.quizTitle}
                                        </td>
                                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '0.25rem 0.6rem',
                                                borderRadius: '12px',
                                                background: diffStyle.bg,
                                                color: diffStyle.color,
                                                fontSize: '0.75rem',
                                                fontWeight: '600',
                                                textTransform: 'capitalize'
                                            }}>
                                                {entry.difficulty || 'Medium'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--primary)', fontWeight: 'bold', fontSize: '1rem' }}>
                                            {entry.percentage}%
                                        </td>
                                        <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            {formatTime(entry.time_taken)}
                                        </td>
                                        {filter === 'all' && (
                                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                <span style={{
                                                    padding: '0.2rem 0.5rem',
                                                    borderRadius: '8px',
                                                    background: 'rgba(139, 92, 246, 0.2)',
                                                    color: 'var(--primary)',
                                                    fontSize: '0.8rem',
                                                    fontWeight: '600'
                                                }}>
                                                    #{entry.attemptNumber || 1}
                                                </span>
                                            </td>
                                        )}

                                        <td style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                            {formatDate(entry.completed_at)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {!loading && scores.length === 0 && (
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
