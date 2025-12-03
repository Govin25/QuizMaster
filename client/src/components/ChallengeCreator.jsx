import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import API_URL from '../config';

const ChallengeCreator = ({ onClose, onChallengeCreated }) => {
    const { user, fetchWithAuth } = useAuth();
    const { showSuccess, showError } = useToast();

    const [step, setStep] = useState(1);
    const [selectedQuiz, setSelectedQuiz] = useState(null);
    const [opponentUsername, setOpponentUsername] = useState('');
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchFilter, setSearchFilter] = useState('all');
    const [isSearching, setIsSearching] = useState(false);
    const [suggestedUsers, setSuggestedUsers] = useState([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);

    useEffect(() => {
        fetchQuizzes();
    }, [searchFilter]);

    // Debounced search effect
    useEffect(() => {
        if (!searchQuery.trim()) {
            return;
        }

        const timeoutId = setTimeout(() => {
            performSearch();
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchQuery, searchFilter]);

    const fetchQuizzes = async () => {
        try {
            setLoading(true);

            if (searchFilter === 'mine') {
                // Fetch only user's own quizzes
                const response = await fetchWithAuth(`${API_URL}/api/quizzes/my-quizzes`);
                if (!response.ok) throw new Error('Failed to fetch quizzes');
                const quizzes = await response.json();
                setQuizzes(quizzes);
            } else {
                // Fetch all public quizzes (top 10 by likes)
                const response = await fetchWithAuth(`${API_URL}/api/quizzes/public`);
                if (!response.ok) throw new Error('Failed to fetch quizzes');

                const data = await response.json();
                // The endpoint returns an array directly
                setQuizzes(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            showError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const performSearch = async () => {
        try {
            setIsSearching(true);
            const response = await fetchWithAuth(
                `${API_URL}/api/quizzes/search-for-challenge?query=${encodeURIComponent(searchQuery)}&filter=${searchFilter}`
            );
            if (!response.ok) throw new Error('Failed to search quizzes');

            const data = await response.json();
            setQuizzes(data.quizzes || []);
        } catch (err) {
            showError(err.message);
        } finally {
            setIsSearching(false);
        }
    };

    const fetchSuggestedUsers = async () => {
        try {
            setLoadingSuggestions(true);
            const [followersRes, followingRes] = await Promise.all([
                fetchWithAuth(`${API_URL}/api/social/followers/${user.id}?limit=10`),
                fetchWithAuth(`${API_URL}/api/social/following/${user.id}?limit=10`)
            ]);

            const followers = followersRes.ok ? await followersRes.json() : [];
            const following = followingRes.ok ? await followingRes.json() : [];

            // Combine and deduplicate
            const combined = [...followers, ...following];
            const uniqueUsers = Array.from(
                new Map(combined.map(u => [u.id, u])).values()
            );

            // Filter out admins
            const nonAdminUsers = uniqueUsers.filter(u => u.role !== 'admin');

            setSuggestedUsers(nonAdminUsers.slice(0, 8)); // Show max 8 suggestions
        } catch (err) {
            console.error('Failed to fetch suggestions:', err);
        } finally {
            setLoadingSuggestions(false);
        }
    };

    const handleCreateChallenge = async () => {
        if (!selectedQuiz || !opponentUsername.trim()) {
            showError('Please select a quiz and enter opponent username');
            return;
        }

        try {
            setCreating(true);
            const response = await fetchWithAuth(`${API_URL}/api/challenges/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    quizId: selectedQuiz.id,
                    opponentUsername: opponentUsername.trim()
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to create challenge');
            }

            const data = await response.json();
            showSuccess(`Challenge sent to ${opponentUsername}! 🎯`);

            if (onChallengeCreated) {
                onChallengeCreated(data.challenge);
            }

            // Show success animation
            setStep(3);
            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (err) {
            showError(err.message);
        } finally {
            setCreating(false);
        }
    };

    const renderStep1 = () => (
        <div>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Select a Quiz</h3>

            {/* Search Bar */}
            <div style={{ marginBottom: '1rem' }}>
                <div style={{ position: 'relative' }}>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search quizzes..."
                        style={{
                            width: '100%',
                            padding: '0.75rem 2.5rem 0.75rem 1rem',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '1rem'
                        }}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            style={{
                                position: 'absolute',
                                right: '0.5rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                fontSize: '1.2rem',
                                padding: '0.25rem 0.5rem'
                            }}
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Filter Toggle */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <button
                    onClick={() => setSearchFilter('all')}
                    style={{
                        flex: 1,
                        background: searchFilter === 'all' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        border: searchFilter === 'all' ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid var(--glass-border)',
                        color: searchFilter === 'all' ? '#a5b4fc' : 'var(--text-muted)',
                        padding: '0.5rem',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        borderRadius: '8px',
                        fontWeight: '600',
                        transition: 'all 0.2s'
                    }}
                >
                    🌐 All Quizzes
                </button>
                <button
                    onClick={() => setSearchFilter('mine')}
                    style={{
                        flex: 1,
                        background: searchFilter === 'mine' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        border: searchFilter === 'mine' ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid var(--glass-border)',
                        color: searchFilter === 'mine' ? '#a5b4fc' : 'var(--text-muted)',
                        padding: '0.5rem',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        borderRadius: '8px',
                        fontWeight: '600',
                        transition: 'all 0.2s'
                    }}
                >
                    📝 My Quizzes
                </button>
            </div>

            {(loading || isSearching) ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    {isSearching ? 'Searching...' : 'Loading quizzes...'}
                </div>
            ) : quizzes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    <p>{searchQuery ? 'No quizzes found matching your search.' : 'No quizzes available. Add some quizzes to your library first!'}</p>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gap: '1rem',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    padding: '0.5rem'
                }}>
                    {quizzes.map(quiz => (
                        <div
                            key={quiz.id}
                            onClick={() => setSelectedQuiz(quiz)}
                            style={{
                                padding: '1rem',
                                background: selectedQuiz?.id === quiz.id
                                    ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))'
                                    : 'rgba(255, 255, 255, 0.05)',
                                border: selectedQuiz?.id === quiz.id
                                    ? '2px solid rgba(99, 102, 241, 0.5)'
                                    : '1px solid var(--glass-border)',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                if (selectedQuiz?.id !== quiz.id) {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (selectedQuiz?.id !== quiz.id) {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                }
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0' }}>{quiz.title}</h4>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <span style={{
                                            background: 'rgba(99, 102, 241, 0.2)',
                                            border: '1px solid rgba(99, 102, 241, 0.3)',
                                            color: '#a5b4fc',
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '8px',
                                            fontSize: '0.75rem'
                                        }}>
                                            {quiz.category}
                                        </span>
                                        <span style={{
                                            background: 'rgba(251, 146, 60, 0.2)',
                                            border: '1px solid rgba(251, 146, 60, 0.3)',
                                            color: '#fb923c',
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '8px',
                                            fontSize: '0.75rem'
                                        }}>
                                            {quiz.difficulty}
                                        </span>
                                        <span style={{
                                            color: 'var(--text-muted)',
                                            fontSize: '0.75rem',
                                            padding: '0.25rem 0.5rem'
                                        }}>
                                            📝 {quiz.questionCount || 0} questions
                                        </span>
                                        <span style={{
                                            background: quiz.is_public ? 'rgba(34, 197, 94, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                                            border: quiz.is_public ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(100, 116, 139, 0.3)',
                                            color: quiz.is_public ? '#22c55e' : '#94a3b8',
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '8px',
                                            fontSize: '0.75rem'
                                        }}>
                                            {quiz.is_public ? '🌐 Public' : '🔒 Private'}
                                        </span>
                                    </div>
                                </div>
                                {selectedQuiz?.id === quiz.id && (
                                    <div style={{ fontSize: '1.5rem' }}>✅</div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
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
                    Cancel
                </button>
                <button
                    onClick={() => setStep(2)}
                    disabled={!selectedQuiz}
                    style={{
                        flex: 1,
                        background: selectedQuiz
                            ? 'linear-gradient(135deg, var(--primary), var(--secondary))'
                            : 'rgba(255, 255, 255, 0.1)',
                        border: 'none',
                        color: 'white',
                        padding: '0.75rem',
                        fontSize: '1rem',
                        cursor: selectedQuiz ? 'pointer' : 'not-allowed',
                        borderRadius: '8px',
                        fontWeight: '600',
                        opacity: selectedQuiz ? 1 : 0.5
                    }}
                >
                    Next →
                </button>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Challenge an Opponent</h3>

            {/* Selected Quiz Summary */}
            <div style={{
                padding: '1rem',
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: '12px',
                marginBottom: '2rem'
            }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    Selected Quiz:
                </div>
                <div style={{ fontWeight: '600' }}>{selectedQuiz?.title}</div>
            </div>

            {/* Opponent Username Input */}
            <div style={{ marginBottom: '2rem' }}>
                <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: '0.9rem',
                    fontWeight: '600'
                }}>
                    Opponent Username
                </label>
                <input
                    type="text"
                    value={opponentUsername}
                    onChange={(e) => setOpponentUsername(e.target.value)}
                    onFocus={() => {
                        if (suggestedUsers.length === 0 && !loadingSuggestions) {
                            fetchSuggestedUsers();
                        }
                    }}
                    placeholder="Enter username..."
                    style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '1rem'
                    }}
                    autoFocus
                />

                {/* Suggested Users */}
                {suggestedUsers.length > 0 && !opponentUsername && (
                    <div style={{ marginTop: '1rem' }}>
                        <div style={{
                            fontSize: '0.85rem',
                            color: 'var(--text-muted)',
                            marginBottom: '0.75rem',
                            fontWeight: '600'
                        }}>
                            💡 Suggested opponents (from your network):
                        </div>
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '0.5rem'
                        }}>
                            {suggestedUsers.map(user => (
                                <button
                                    key={user.id}
                                    onClick={() => setOpponentUsername(user.username)}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))',
                                        border: '1px solid rgba(99, 102, 241, 0.3)',
                                        borderRadius: '20px',
                                        color: 'white',
                                        fontSize: '0.85rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        fontWeight: '500'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(139, 92, 246, 0.3))';
                                        e.target.style.transform = 'translateY(-2px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))';
                                        e.target.style.transform = 'translateY(0)';
                                    }}
                                >
                                    @{user.username}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {loadingSuggestions && (
                    <div style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        marginTop: '0.5rem'
                    }}>
                        Loading suggestions...
                    </div>
                )}

                {!loadingSuggestions && suggestedUsers.length === 0 && !opponentUsername && (
                    <div style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        marginTop: '0.5rem'
                    }}>
                        💡 Enter the exact username of the person you want to challenge
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                    onClick={() => setStep(1)}
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
                    ← Back
                </button>
                <button
                    onClick={handleCreateChallenge}
                    disabled={!opponentUsername.trim() || creating}
                    style={{
                        flex: 1,
                        background: opponentUsername.trim() && !creating
                            ? 'linear-gradient(135deg, var(--primary), var(--secondary))'
                            : 'rgba(255, 255, 255, 0.1)',
                        border: 'none',
                        color: 'white',
                        padding: '0.75rem',
                        fontSize: '1rem',
                        cursor: opponentUsername.trim() && !creating ? 'pointer' : 'not-allowed',
                        borderRadius: '8px',
                        fontWeight: '600',
                        opacity: opponentUsername.trim() && !creating ? 1 : 0.5
                    }}
                >
                    {creating ? 'Sending...' : '🎯 Send Challenge'}
                </button>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>🎉</div>
            <h2 style={{ margin: '0 0 1rem 0' }}>Challenge Sent!</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
                Waiting for {opponentUsername} to accept...
            </p>
        </div>
    );

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)'
        }}>
            <div style={{
                background: 'linear-gradient(135deg, rgba(30, 30, 50, 0.95), rgba(20, 20, 40, 0.95))',
                border: '1px solid var(--glass-border)',
                borderRadius: '16px',
                padding: '2rem',
                maxWidth: '600px',
                width: '90%',
                maxHeight: '80vh',
                overflowY: 'auto',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
            }}>
                {/* Progress Indicator */}
                {step < 3 && (
                    <div style={{
                        display: 'flex',
                        gap: '0.5rem',
                        marginBottom: '2rem',
                        justifyContent: 'center'
                    }}>
                        {[1, 2].map(s => (
                            <div
                                key={s}
                                style={{
                                    width: '40px',
                                    height: '4px',
                                    background: s <= step
                                        ? 'linear-gradient(90deg, var(--primary), var(--secondary))'
                                        : 'rgba(255, 255, 255, 0.2)',
                                    borderRadius: '2px',
                                    transition: 'all 0.3s'
                                }}
                            />
                        ))}
                    </div>
                )}

                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
            </div>
        </div>
    );
};

export default ChallengeCreator;
