import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import API_URL from '../config';

const Home = ({ onStartQuiz, onViewReport }) => {
    const { token } = useAuth();
    const { showSuccess, showError } = useToast();
    const [library, setLibrary] = useState({ recentlyAdded: [], completed: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLibrary();
    }, []);

    const fetchLibrary = async () => {
        try {
            const response = await fetch(`${API_URL}/api/quizzes/my-library`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
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

    const handleRemoveFromLibrary = async (quizId) => {
        try {
            const response = await fetch(`${API_URL}/api/quizzes/${quizId}/remove-from-library`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
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
                position: 'relative'
            }}
        >
            {/* Remove button for recently added quizzes */}
            {!isCompleted && (
                <button
                    onClick={() => handleRemoveFromLibrary(quiz.id)}
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
                        fontWeight: '600'
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
                paddingRight: isCompleted ? '0' : '6rem' // Space for remove button
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

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', flexWrap: 'wrap' }}>
                {isCompleted && (
                    <button
                        onClick={() => onStartQuiz(quiz.id)}
                        style={{
                            flex: 1,
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            padding: '0.75rem',
                            fontSize: '0.95rem'
                        }}
                    >
                        🔄 Retake {quiz.attemptCount > 1 ? `(${quiz.attemptCount} attempts)` : ''}
                    </button>
                )}
                <button
                    onClick={() => isCompleted ? onViewReport(quiz.result_id) : onStartQuiz(quiz.id)}
                    style={{
                        flex: 1,
                        background: isCompleted
                            ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(139, 92, 246, 0.3))'
                            : 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        border: isCompleted ? '1px solid rgba(99, 102, 241, 0.5)' : 'none',
                        padding: '0.75rem',
                        fontSize: '0.95rem'
                    }}
                >
                    {isCompleted ? '📊 View Report' : '▶️ Start Quiz'}
                </button>
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
