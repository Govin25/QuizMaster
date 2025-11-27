import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import API_URL from '../config';

const QuizHub = ({ onBack }) => {
    const { token } = useAuth();
    const { showSuccess, showError } = useToast();
    const [quizzes, setQuizzes] = useState([]);
    const [filteredQuizzes, setFilteredQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [addedQuizzes, setAddedQuizzes] = useState(new Set());
    const [selectedQuiz, setSelectedQuiz] = useState(null);

    useEffect(() => {
        fetchPublicQuizzes();
        fetchUserLibrary();
    }, []);

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredQuizzes(quizzes);
        } else {
            const filtered = quizzes.filter(quiz =>
                quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                quiz.category.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredQuizzes(filtered);
        }
    }, [searchQuery, quizzes]);

    const fetchPublicQuizzes = async () => {
        try {
            const response = await fetch(`${API_URL}/api/quizzes/public`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to fetch quizzes (${response.status})`);
            }
            const data = await response.json();
            setQuizzes(data);
            setFilteredQuizzes(data);
        } catch (err) {
            setError(`${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserLibrary = async () => {
        try {
            const response = await fetch(`${API_URL}/api/quizzes/my-library`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                const allLibraryQuizzes = [...data.recentlyAdded, ...data.completed];
                const quizIds = new Set(allLibraryQuizzes.map(q => q.id));
                setAddedQuizzes(quizIds);
            }
        } catch (err) {
            console.error('Error fetching library:', err);
        }
    };

    const handleAddToLibrary = async (quizId) => {
        try {
            const response = await fetch(`${API_URL}/api/quizzes/${quizId}/add-to-library`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to add quiz');
            }
            showSuccess('Quiz added to your home!');
            setAddedQuizzes(prev => new Set([...prev, quizId]));
        } catch (err) {
            showError(err.message);
        }
    };

    const handleViewDetails = async (quizId) => {
        try {
            const response = await fetch(`${API_URL}/api/quizzes/${quizId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) throw new Error('Failed to fetch quiz details');
            const data = await response.json();
            setSelectedQuiz(data);
        } catch (err) {
            showError(err.message);
        }
    };

    if (loading) {
        return (
            <div className="glass-card" style={{ maxWidth: '1200px', width: '100%' }}>
                <h2>Quiz Hub</h2>
                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} className="skeleton" style={{ height: '200px' }} />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="glass-card" style={{ maxWidth: '600px', width: '100%' }}>
                <h2>Quiz Hub</h2>
                <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: '#ef4444',
                    background: 'rgba(239, 68, 68, 0.1)',
                    borderRadius: '12px',
                    border: '1px solid rgba(239, 68, 68, 0.3)'
                }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
                    <div>{error}</div>
                </div>
                <button onClick={onBack} style={{ marginTop: '2rem', width: '100%' }}>Back to Menu</button>
            </div>
        );
    }

    // Quiz Details Modal
    if (selectedQuiz) {
        const isAdded = addedQuizzes.has(selectedQuiz.id);
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
                        ← Back to Quiz Hub
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

                {/* Add to Home Button in Details View */}
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
        <div className="glass-card" style={{ maxWidth: '1200px', width: '100%' }}>
            {/* Header with Back Button */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
                gap: '1rem',
                flexWrap: 'wrap'
            }}>
                <h2 style={{ margin: 0 }}>🌐 Quiz Hub</h2>
                <button onClick={onBack} style={{
                    background: 'rgba(255,255,255,0.1)',
                    padding: '0.6rem 1.2rem'
                }}>
                    ← Back
                </button>
            </div>

            {/* Premium Search Bar */}
            <div style={{
                marginBottom: '2rem',
                position: 'relative'
            }}>
                <div style={{
                    position: 'relative',
                    background: 'rgba(15, 23, 42, 0.5)',
                    borderRadius: '12px',
                    border: '1px solid var(--glass-border)',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease'
                }}
                    onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--primary)';
                        e.currentTarget.style.boxShadow = '0 0 20px rgba(139, 92, 246, 0.3)';
                    }}
                    onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--glass-border)';
                        e.currentTarget.style.boxShadow = 'none';
                    }}>
                    <span style={{
                        position: 'absolute',
                        left: '1rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '1.2rem',
                        color: 'var(--text-muted)'
                    }}>
                        🔍
                    </span>
                    <input
                        type="text"
                        placeholder="Search quizzes by title or category..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '1rem 1rem 1rem 3rem',
                            background: 'transparent',
                            border: 'none',
                            color: 'white',
                            fontSize: '1rem',
                            outline: 'none',
                            margin: 0
                        }}
                    />
                </div>
            </div>

            {/* Quiz Grid */}
            {filteredQuizzes.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '4rem 2rem',
                    color: 'var(--text-muted)'
                }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📚</div>
                    <h3>No quizzes found</h3>
                    <p>{searchQuery ? 'Try a different search term' : 'No public quizzes available yet'}</p>
                </div>
            ) : (
                <div className="grid" style={{
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '1.5rem'
                }}>
                    {filteredQuizzes.map(quiz => {
                        const isAdded = addedQuizzes.has(quiz.id);
                        return (
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
                                    gap: '1rem'
                                }}
                            >
                                {/* Category Badge */}
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <span style={{
                                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))',
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

                                {/* Title */}
                                <h3 style={{
                                    margin: 0,
                                    fontSize: '1.25rem',
                                    color: 'white',
                                    lineHeight: '1.4'
                                }}>
                                    {quiz.title}
                                </h3>

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

                                {/* Action Buttons */}
                                <div style={{
                                    marginTop: 'auto',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.5rem'
                                }}>
                                    <button
                                        onClick={() => handleViewDetails(quiz.id)}
                                        style={{
                                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))',
                                            border: '1px solid rgba(99, 102, 241, 0.3)',
                                            color: '#a5b4fc',
                                            padding: '0.75rem',
                                            fontSize: '0.9rem'
                                        }}
                                    >
                                        👁️ View Details
                                    </button>
                                    <button
                                        onClick={() => handleAddToLibrary(quiz.id)}
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
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default QuizHub;
