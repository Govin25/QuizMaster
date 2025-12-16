import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import API_URL from '../config';

const TrendingQuizzes = ({ onViewDetails: parentOnViewDetails, selectedQuiz, selectedQuizSource }) => {
    const { fetchWithAuth } = useAuth();
    const { showSuccess, showError } = useToast();
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [addedQuizzes, setAddedQuizzes] = useState(new Set());

    useEffect(() => {
        fetchTrendingQuizzes();
        fetchUserLibrary();

        // Listen for quiz added events from other components
        const handleQuizAdded = (event) => {
            setAddedQuizzes(prev => new Set([...prev, event.detail.quizId]));
        };
        window.addEventListener('quizAddedToLibrary', handleQuizAdded);

        return () => {
            window.removeEventListener('quizAddedToLibrary', handleQuizAdded);
        };
    }, []);

    const fetchTrendingQuizzes = async () => {
        try {
            const response = await fetch(`${API_URL}/api/social/trending?limit=6`);
            if (response.ok) {
                const data = await response.json();
                setQuizzes(data);
            }
        } catch (err) {
            console.error('Failed to fetch trending quizzes:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserLibrary = async () => {
        try {
            const response = await fetchWithAuth(`${API_URL}/api/quizzes/my-library`);
            if (response.ok) {
                const data = await response.json();
                const allLibraryQuizzes = [...data.recentlyAdded, ...data.completed];
                const quizIds = new Set(allLibraryQuizzes.map(q => q.id));
                setAddedQuizzes(quizIds);
            }
        } catch (err) {
            console.error('Failed to fetch library:', err);
        }
    };

    const handleAddToLibrary = async (quizId) => {
        try {
            const response = await fetchWithAuth(`${API_URL}/api/quizzes/${quizId}/add-to-library`, {
                method: 'POST'
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to add quiz');
            }
            showSuccess('Quiz added to your home!');
            setAddedQuizzes(prev => new Set([...prev, quizId]));

            // Dispatch event to notify other components
            window.dispatchEvent(new CustomEvent('quizAddedToLibrary', { detail: { quizId } }));
        } catch (err) {
            showError(err.message);
        }
    };

    if (loading) {
        return (
            <div className="glass-card">
                <h2 style={{ marginBottom: '1.5rem' }}>🔥 Trending Quizzes</h2>
                <div className="grid" style={{
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '1.5rem'
                }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} className="skeleton" style={{ height: '200px', borderRadius: '16px' }} />
                    ))}
                </div>
            </div>
        );
    }

    if (quizzes.length === 0) {
        return null;
    }

    return (
        <div className="glass-card">
            <h2 style={{ marginBottom: '1.5rem' }}>🔥 Trending Quizzes</h2>
            <div className="grid" style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1.5rem'
            }}>
                {quizzes.map(quiz => (
                    <QuizCard
                        key={quiz.id}
                        quiz={quiz}
                        onAddToLibrary={handleAddToLibrary}
                        onViewDetails={parentOnViewDetails}
                        isAdded={addedQuizzes.has(quiz.id)}
                    />
                ))}
            </div>
        </div>
    );
};

const QuizCard = ({ quiz, onAddToLibrary, onViewDetails, isAdded }) => {
    const [likeCount] = useState(parseInt(quiz.likesCount) || 0);

    return (
        <div
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
            onClick={() => onViewDetails(quiz.id)}
            onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(99, 102, 241, 0.2)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--glass-border)';
                e.currentTarget.style.boxShadow = 'none';
            }}
        >
            {/* Trending Badge */}
            <div style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                padding: '0.3rem 0.7rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: '700',
                color: 'white'
            }}>
                🔥 TRENDING
            </div>

            {/* Title */}
            <h3 style={{
                margin: 0,
                fontSize: '1.25rem',
                color: 'white',
                lineHeight: '1.4',
                paddingRight: '6.5rem', // Increased padding to avoid badge overlap
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2, // Limit to 2 lines
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

            {/* Creator Info */}
            {quiz.creator && (
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

            {/* Question Count */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'var(--text-muted)',
                fontSize: '0.9rem'
            }}>
                <span>📝</span>
                <span>{quiz.questionCount || 0} Questions</span>
            </div>

            {/* Like Count (Read-only) */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'var(--text-muted)',
                fontSize: '0.9rem'
            }}>
                <span style={{ fontSize: '1.1rem' }}>❤️</span>
                <span>{likeCount} {likeCount === 1 ? 'Like' : 'Likes'}</span>
            </div>

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

            {/* Action Buttons */}
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center'
            }}>
                <button
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent card click
                        onAddToLibrary(quiz.id);
                    }}
                    disabled={isAdded}
                    style={{
                        flex: 1,
                        background: isAdded
                            ? 'rgba(34, 197, 94, 0.2)'
                            : 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        border: isAdded ? '1px solid rgba(34, 197, 94, 0.3)' : 'none',
                        color: isAdded ? '#22c55e' : 'white',
                        padding: '0.75rem',
                        fontSize: '0.95rem',
                        borderRadius: '12px',
                        fontWeight: '600',
                        cursor: isAdded ? 'default' : 'pointer',
                        transition: 'all 0.3s',
                        opacity: isAdded ? 0.7 : 1
                    }}
                    onMouseEnter={(e) => {
                        if (!isAdded) {
                            e.target.style.transform = 'scale(1.02)';
                            e.target.style.boxShadow = '0 8px 20px rgba(99, 102, 241, 0.3)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.transform = 'scale(1)';
                        e.target.style.boxShadow = 'none';
                    }}
                >
                    {isAdded ? '✓ Added to Home' : '+ Add to Home'}
                </button>
            </div>
        </div>
    );
};

export default TrendingQuizzes;
