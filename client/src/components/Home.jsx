import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import API_URL from '../config';
import { LikeButton } from './SocialFeatures';
import { formatDateShort } from '../utils/dateUtils';

const Home = ({ onStartQuiz, onViewReport, onViewAllAttempts }) => {
    const { fetchWithAuth } = useAuth();
    const { showSuccess, showError } = useToast();
    const [library, setLibrary] = useState({ recentlyAdded: [], completed: [] });
    const [loading, setLoading] = useState(true);
    const [likesData, setLikesData] = useState({}); // Store like status and counts
    const [selectedQuiz, setSelectedQuiz] = useState(null); // For viewing quiz details

    useEffect(() => {
        fetchLibrary();
    }, []);

    // Listen for cross-tab updates (when quiz is completed in another tab)
    useEffect(() => {
        const handleStorageChange = (e) => {
            // Refresh library when quiz is completed in another tab
            if (e.key === 'quiz_completed_event' || e.key?.startsWith('quiz_session_')) {
                fetchLibrary();
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const fetchLibrary = async () => {
        try {
            const response = await fetchWithAuth(`${API_URL}/api/quizzes/my-library`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to fetch library');
            }
            const data = await response.json();
            setLibrary(data);
        } catch (err) {
            // Only show error if it's a real error, not just empty library
            if (err.message !== 'Failed to fetch library') {
                showError(err.message);
            }
            // Set empty library on error
            setLibrary({ recentlyAdded: [], completed: [] });
        } finally {
            setLoading(false);
        }
    };

    // Fetch like status for all quizzes
    useEffect(() => {
        const allQuizzes = [...library.recentlyAdded, ...library.completed];
        allQuizzes.forEach(quiz => {
            if (quiz.is_public) {
                fetchLikeStatus(quiz.id);
            }
        });
    }, [library]);

    const fetchLikeStatus = async (quizId) => {
        try {
            const [likedRes, likesRes] = await Promise.all([
                fetchWithAuth(`${API_URL}/api/social/quizzes/${quizId}/has-liked`),
                fetch(`${API_URL}/api/social/quizzes/${quizId}/likes`)
            ]);

            const hasLiked = likedRes.ok ? (await likedRes.json()).hasLiked : false;
            const likesInfo = likesRes.ok ? await likesRes.json() : { count: 0 };

            setLikesData(prev => ({
                ...prev,
                [quizId]: {
                    hasLiked,
                    count: likesInfo.count || 0
                }
            }));
        } catch (err) {
            console.error('Failed to fetch like status:', err);
        }
    };

    const handleViewDetails = async (quizId) => {
        try {
            const response = await fetchWithAuth(`${API_URL}/api/quizzes/${quizId}`);
            if (!response.ok) throw new Error('Failed to fetch quiz details');
            const data = await response.json();
            setSelectedQuiz(data);
        } catch (err) {
            showError(err.message);
        }
    };

    const handleRemoveFromLibrary = async (quizId) => {
        try {
            const response = await fetchWithAuth(`${API_URL}/api/quizzes/${quizId}/remove-from-library`, {
                method: 'DELETE'
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.error || `Failed to remove quiz (${response.status})`);
            }

            showSuccess('Quiz removed from your home!');
            fetchLibrary(); // Refresh library
        } catch (err) {
            showError(err.message);
            console.error('Remove error:', err);
        }
    };

    const renderQuizCard = (quiz, isCompleted = false) => (
        <div
            key={quiz.id}
            className="hover-lift"
            style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '16px',
                padding: '1.5rem',
                border: '1px solid var(--glass-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                position: 'relative',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
            }}
            onClick={() => handleViewDetails(quiz.id)}
            onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(99, 102, 241, 0.2)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--glass-border)';
                e.currentTarget.style.boxShadow = 'none';
            }}
        >
            {/* Remove button for recently added quizzes */}
            {!isCompleted && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFromLibrary(quiz.id);
                    }}
                    style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#ef4444',
                        padding: '0.4rem 0.6rem',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontWeight: '600',
                        zIndex: 2
                    }}
                    onMouseEnter={(e) => {
                        e.target.style.background = 'rgba(239, 68, 68, 0.3)';
                        e.target.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.background = 'rgba(239, 68, 68, 0.2)';
                        e.target.style.transform = 'scale(1)';
                    }}
                >
                    🗑️ Remove
                </button>
            )}

            {/* Title */}
            <h3 style={{
                margin: 0,
                fontSize: '1.25rem',
                color: 'white',
                lineHeight: '1.4',
                paddingRight: isCompleted ? '0' : '6rem', // Space for remove button
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                wordBreak: 'break-word'
            }}>
                {quiz.title}
            </h3>

            {/* Meta Info */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{
                    background: 'rgba(99, 102, 241, 0.2)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    color: '#a5b4fc',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                }}>
                    {quiz.category}
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
                    {quiz.difficulty}
                </span>
            </div>

            {/* Creator Info (for public quizzes) */}
            {quiz.creator && quiz.is_public && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: 'var(--text-muted)',
                    fontSize: '0.85rem'
                }}>
                    <span>👤</span>
                    <span>by {quiz.creator.username}</span>
                </div>
            )}

            {/* Question Count or Score */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'var(--text-muted)',
                fontSize: '0.9rem'
            }}>
                {isCompleted ? (
                    <>
                        <span>🏆</span>
                        <span>Score: {quiz.score}%</span>
                    </>
                ) : (
                    <>
                        <span>📝</span>
                        <span>{quiz.questionCount || 0} Questions</span>
                    </>
                )}
            </div>

            {/* Quiz ID */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'var(--text-muted)',
                fontSize: '0.85rem'
            }}>
                <span>🆔</span>
                <span>ID: {quiz.id}</span>
            </div>

            {/* Attempt Count for completed quizzes */}
            {isCompleted && quiz.attemptCount > 0 && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: 'var(--text-muted)',
                    fontSize: '0.9rem'
                }}>
                    <span>🔄</span>
                    <span>{quiz.attemptCount} {quiz.attemptCount === 1 ? 'Attempt' : 'Attempts'}</span>
                </div>
            )}

            {/* Click to view hint */}
            <div style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                fontStyle: 'italic',
                textAlign: 'center',
                marginTop: 'auto',
                paddingTop: '0.5rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
                👁️ Click to view details
            </div>

            {/* Action Buttons Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {/* Like Button Row (for public completed quizzes only) */}
                {quiz.is_public && isCompleted && likesData[quiz.id] && (
                    <div onClick={(e) => e.stopPropagation()}>
                        <LikeButton
                            quizId={quiz.id}
                            initialLiked={likesData[quiz.id].hasLiked}
                            initialCount={likesData[quiz.id].count}
                            onLikeChange={(liked, count) => {
                                setLikesData(prev => ({
                                    ...prev,
                                    [quiz.id]: { hasLiked: liked, count }
                                }));
                            }}
                        />
                    </div>
                )}

                {/* Start/View Buttons */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {isCompleted && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onStartQuiz(quiz.id);
                            }}
                            style={{
                                flex: 1,
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                padding: '0.75rem',
                                fontSize: '0.95rem',
                                cursor: 'pointer',
                                borderRadius: '8px',
                                color: 'white',
                                fontWeight: '600',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.background = 'rgba(255,255,255,0.15)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = 'rgba(255,255,255,0.1)';
                            }}
                        >
                            🔄 Retake
                        </button>
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            isCompleted ? onViewAllAttempts(quiz.id) : onStartQuiz(quiz.id);
                        }}
                        style={{
                            flex: 1,
                            background: isCompleted
                                ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(139, 92, 246, 0.3))'
                                : 'linear-gradient(135deg, var(--primary), var(--secondary))',
                            border: isCompleted ? '1px solid rgba(99, 102, 241, 0.4)' : 'none',
                            color: 'white',
                            padding: '0.75rem',
                            fontSize: '0.95rem',
                            cursor: 'pointer',
                            borderRadius: '8px',
                            fontWeight: '600',
                            transition: 'all 0.3s'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.transform = 'scale(1.02)';
                            e.target.style.boxShadow = '0 8px 20px rgba(99, 102, 241, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = 'scale(1)';
                            e.target.style.boxShadow = 'none';
                        }}
                    >
                        {isCompleted ? '📊 View Report' : '▶️ Start Quiz'}
                    </button>
                </div>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="glass-card" style={{ maxWidth: '1200px', width: '100%' }}>
                <h2>Home</h2>
                <div className="skeleton" style={{ height: '200px' }} />
            </div>
        );
    }

    // Quiz Details Modal
    if (selectedQuiz) {
        const isInLibrary = library.recentlyAdded.some(q => q.id === selectedQuiz.id) ||
            library.completed.some(q => q.id === selectedQuiz.id);
        const completedQuiz = library.completed.find(q => q.id === selectedQuiz.id);

        return (
            <div className="glass-card" style={{ maxWidth: '800px', width: '100%' }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '2rem'
                }}>
                    <h2 style={{ margin: 0 }}>Quiz Details</h2>
                    <button onClick={() => setSelectedQuiz(null)} style={{
                        background: 'rgba(255,255,255,0.1)',
                        padding: '0.6rem 1.2rem'
                    }}>
                        ← Back to Home
                    </button>
                </div>

                {/* Quiz Header */}
                <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                    <h1 style={{
                        fontSize: '2.5rem',
                        marginBottom: '1rem',
                        background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        {selectedQuiz.title}
                    </h1>

                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '1rem',
                        marginBottom: '1.5rem',
                        flexWrap: 'wrap'
                    }}>
                        <span className="badge" style={{
                            background: 'rgba(99, 102, 241, 0.2)',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            color: '#a5b4fc',
                            padding: '0.5rem 1rem',
                            fontSize: '1rem'
                        }}>
                            {selectedQuiz.category}
                        </span>
                        <span className="badge" style={{
                            background: 'rgba(251, 146, 60, 0.2)',
                            border: '1px solid rgba(251, 146, 60, 0.3)',
                            color: '#fb923c',
                            padding: '0.5rem 1rem',
                            fontSize: '1rem'
                        }}>
                            {selectedQuiz.difficulty}
                        </span>
                    </div>

                    {selectedQuiz.creator && (
                        <div style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                            Created by <span style={{ color: 'white', fontWeight: '600' }}>{selectedQuiz.creator.username}</span>
                        </div>
                    )}
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                        Quiz ID: <span style={{
                            color: '#a5b4fc',
                            fontWeight: '600',
                            background: 'rgba(99, 102, 241, 0.1)',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '6px',
                            fontFamily: 'monospace'
                        }}>{selectedQuiz.id}</span>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid" style={{
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '1rem',
                    marginBottom: '2rem'
                }}>
                    <div style={{
                        background: 'rgba(255,255,255,0.03)',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        textAlign: 'center',
                        border: '1px solid var(--glass-border)'
                    }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📝</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                            {selectedQuiz.questions?.length || 0}
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Questions</div>
                    </div>
                    {completedQuiz && (
                        <>
                            <div style={{
                                background: 'rgba(255,255,255,0.03)',
                                padding: '1.5rem',
                                borderRadius: '12px',
                                textAlign: 'center',
                                border: '1px solid var(--glass-border)'
                            }}>
                                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏆</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                                    {completedQuiz.score}%
                                </div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Best Score</div>
                            </div>
                            <div style={{
                                background: 'rgba(255,255,255,0.03)',
                                padding: '1.5rem',
                                borderRadius: '12px',
                                textAlign: 'center',
                                border: '1px solid var(--glass-border)'
                            }}>
                                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔄</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                                    {completedQuiz.attemptCount || 0}
                                </div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Attempts</div>
                            </div>
                        </>
                    )}
                    {selectedQuiz.likesCount !== undefined && (
                        <div style={{
                            background: 'rgba(255,255,255,0.03)',
                            padding: '1.5rem',
                            borderRadius: '12px',
                            textAlign: 'center',
                            border: '1px solid var(--glass-border)'
                        }}>
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>❤️</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                                {selectedQuiz.likesCount || 0}
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Likes</div>
                        </div>
                    )}
                    <div style={{
                        background: 'rgba(255,255,255,0.03)',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        textAlign: 'center',
                        border: '1px solid var(--glass-border)'
                    }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📅</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                            {formatDateShort(selectedQuiz.created_at)}
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Created</div>
                    </div>
                </div>

                {/* Description & Takeaways */}
                <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    padding: '2rem',
                    borderRadius: '16px',
                    marginBottom: '2rem',
                    border: '1px solid var(--glass-border)'
                }}>
                    <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#c084fc' }}>✨ About this Quiz</h3>
                    <p style={{ lineHeight: '1.6', color: 'var(--text-muted)', marginBottom: '2rem' }}>
                        {completedQuiz
                            ? `You've completed this quiz with a best score of ${completedQuiz.score}%! `
                            : 'Ready to challenge yourself? '}
                        Dive into this <strong>{selectedQuiz.difficulty}</strong> level quiz designed to test your mastery of <strong>{selectedQuiz.category}</strong>.
                        {selectedQuiz.creator ? ` Created by ${selectedQuiz.creator.username}, ` : ' '}
                        this quiz features {selectedQuiz.questions?.length || 0} carefully selected questions to help you sharpen your skills and learn something new.
                    </p>

                    <h4 style={{ marginBottom: '1rem', color: 'white' }}>🎯 What you'll get:</h4>
                    <ul style={{
                        listStyle: 'none',
                        padding: 0,
                        margin: 0,
                        display: 'grid',
                        gap: '0.8rem'
                    }}>
                        <li style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', color: 'var(--text-muted)' }}>
                            <span style={{ color: '#22c55e' }}>✓</span>
                            Test your knowledge in {selectedQuiz.category}
                        </li>
                        <li style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', color: 'var(--text-muted)' }}>
                            <span style={{ color: '#22c55e' }}>✓</span>
                            Challenge yourself with {selectedQuiz.difficulty} level questions
                        </li>
                        <li style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', color: 'var(--text-muted)' }}>
                            <span style={{ color: '#22c55e' }}>✓</span>
                            Track your progress and improve over time
                        </li>
                        {completedQuiz && (
                            <li style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', color: 'var(--text-muted)' }}>
                                <span style={{ color: '#22c55e' }}>✓</span>
                                View your detailed results and retake anytime
                            </li>
                        )}
                    </ul>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {completedQuiz ? (
                        <>
                            <button
                                onClick={() => {
                                    setSelectedQuiz(null);
                                    onStartQuiz(selectedQuiz.id);
                                }}
                                style={{
                                    flex: 1,
                                    minWidth: '200px',
                                    background: 'rgba(255,255,255,0.1)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    color: 'white',
                                    padding: '1rem 2rem',
                                    fontSize: '1.1rem',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    transition: 'all 0.3s'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.background = 'rgba(255,255,255,0.15)';
                                    e.target.style.transform = 'translateY(-2px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = 'rgba(255,255,255,0.1)';
                                    e.target.style.transform = 'translateY(0)';
                                }}
                            >
                                🔄 Retake Quiz
                            </button>
                            <button
                                onClick={() => {
                                    setSelectedQuiz(null);
                                    onViewAllAttempts(selectedQuiz.id);
                                }}
                                style={{
                                    flex: 1,
                                    minWidth: '200px',
                                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                                    border: 'none',
                                    color: 'white',
                                    padding: '1rem 2rem',
                                    fontSize: '1.1rem',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
                                    transition: 'all 0.3s'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.transform = 'translateY(-2px)';
                                    e.target.style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.4)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.transform = 'translateY(0)';
                                    e.target.style.boxShadow = '0 4px 15px rgba(99, 102, 241, 0.3)';
                                }}
                            >
                                📊 View All Attempts
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => {
                                setSelectedQuiz(null);
                                onStartQuiz(selectedQuiz.id);
                            }}
                            style={{
                                width: '100%',
                                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                                border: 'none',
                                color: 'white',
                                padding: '1rem 2rem',
                                fontSize: '1.1rem',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
                                transition: 'all 0.3s'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = '0 4px 15px rgba(99, 102, 241, 0.3)';
                            }}
                        >
                            ▶️ Start Quiz Now
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '1200px', width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Recently Added Section */}
            <div className="glass-card">
                <h2 style={{ marginBottom: '1.5rem' }}>📚 Recently Added</h2>
                {library.recentlyAdded.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '3rem 2rem',
                        color: 'var(--text-muted)'
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎯</div>
                        <h3>No quizzes added yet</h3>
                        <p>Browse Quiz Hub to add quizzes to your home!</p>
                    </div>
                ) : (
                    <div className="grid" style={{
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: '1.5rem'
                    }}>
                        {library.recentlyAdded.map(quiz => renderQuizCard(quiz, false))}
                    </div>
                )}
            </div>

            {/* Completed Quizzes Section */}
            <div className="glass-card">
                <h2 style={{ marginBottom: '1.5rem' }}>✅ Completed Quizzes</h2>
                {library.completed.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '3rem 2rem',
                        color: 'var(--text-muted)'
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎓</div>
                        <h3>No completed quizzes yet</h3>
                        <p>Complete quizzes to see them here!</p>
                    </div>
                ) : (
                    <div className="grid" style={{
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: '1.5rem'
                    }}>
                        {library.completed.map(quiz => renderQuizCard(quiz, true))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;
