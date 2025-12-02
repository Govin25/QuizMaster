import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import API_URL from '../config';

const TrendingQuizzes = () => {
    const { fetchWithAuth } = useAuth();
    const { showSuccess, showError } = useToast();
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [addedQuizzes, setAddedQuizzes] = useState(new Set());
    const [selectedQuiz, setSelectedQuiz] = useState(null);

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

    if (loading) {
        return (
            <div className="glass-card">
                <h2 style={{ marginBottom: '1.5rem' }}>🔥 Trending Quizzes</h2>
                <div className="grid" style={{
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
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

    // Quiz Details Modal
    if (selectedQuiz) {
        const isAdded = addedQuizzes.has(selectedQuiz.id);
        return (
            <div className="glass-card">
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
                        ← Back to Trending
                    </button>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                    <h3>{selectedQuiz.title}</h3>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                        <span className="badge" style={{
                            background: 'rgba(99, 102, 241, 0.2)',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            color: '#a5b4fc'
                        }}>
                            {selectedQuiz.category}
                        </span>
                        <span className="badge" style={{
                            background: 'rgba(251, 146, 60, 0.2)',
                            border: '1px solid rgba(251, 146, 60, 0.3)',
                            color: '#fb923c'
                        }}>
                            {selectedQuiz.difficulty}
                        </span>
                    </div>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                    <h4>Questions ({selectedQuiz.questions?.length || 0})</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {selectedQuiz.questions?.map((q, idx) => (
                            <div key={q.id} style={{
                                background: 'rgba(255,255,255,0.05)',
                                padding: '1rem',
                                borderRadius: '8px',
                                border: '1px solid var(--glass-border)'
                            }}>
                                <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                                    Q{idx + 1}: {q.text}
                                </div>
                                {q.type === 'multiple_choice' && q.options && (
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginLeft: '1rem' }}>
                                        {q.options.map((opt, i) => (
                                            <div key={i} style={{
                                                color: opt === q.correctAnswer ? '#22c55e' : 'inherit'
                                            }}>
                                                {opt} {opt === q.correctAnswer && '✓'}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {q.type === 'true_false' && (
                                    <div style={{ fontSize: '0.9rem', color: '#22c55e', marginLeft: '1rem' }}>
                                        Correct Answer: {q.correctAnswer}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <button
                    onClick={() => handleAddToLibrary(selectedQuiz.id)}
                    disabled={isAdded}
                    style={{
                        width: '100%',
                        background: isAdded
                            ? 'rgba(34, 197, 94, 0.2)'
                            : 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        border: isAdded ? '1px solid rgba(34, 197, 94, 0.3)' : 'none',
                        color: isAdded ? '#22c55e' : 'white',
                        padding: '0.75rem',
                        fontSize: '0.95rem',
                        cursor: isAdded ? 'default' : 'pointer',
                        opacity: isAdded ? 0.7 : 1
                    }}
                >
                    {isAdded ? '✓ Added to Home' : '+ Add to Home'}
                </button>
            </div>
        );
    }

    return (
        <div className="glass-card">
            <h2 style={{ marginBottom: '1.5rem' }}>🔥 Trending Quizzes</h2>
            <div className="grid" style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1.5rem'
            }}>
                {quizzes.map(quiz => (
                    <QuizCard
                        key={quiz.id}
                        quiz={quiz}
                        onAddToLibrary={handleAddToLibrary}
                        onViewDetails={handleViewDetails}
                        isAdded={addedQuizzes.has(quiz.id)}
                    />
                ))}
            </div>
        </div>
    );
};

const QuizCard = ({ quiz, onAddToLibrary, isAdded }) => {
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
                position: 'relative'
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

            {/* Action Buttons */}
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginTop: 'auto',
                alignItems: 'center'
            }}>
                <button
                    onClick={() => onAddToLibrary(quiz.id)}
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
