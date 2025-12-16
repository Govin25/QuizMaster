import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import API_URL from '../config';
import ConfirmDialog from './ConfirmDialog';
import { handleConcurrencyError } from '../utils/concurrencyHandler';

const MyQuizzes = ({ onEdit, onCreate, onBack }) => {
    const { fetchWithAuth } = useAuth();
    const { showSuccess, showError, showInfo } = useToast();
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedQuiz, setSelectedQuiz] = useState(null);
    const [reviewDetails, setReviewDetails] = useState({});
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [inLibrary, setInLibrary] = useState(new Set());
    const [sourceFilter, setSourceFilter] = useState('all');

    // Source filter configuration
    const sourceFilters = [
        { id: 'all', label: 'All', icon: '📚', color: '#a5b4fc' },
        { id: 'ai', label: 'AI Generated', icon: '✨', color: '#c084fc' },
        { id: 'ai_document', label: 'From Document', icon: '📄', color: '#60a5fa' },
        { id: 'ai_video', label: 'From Video', icon: '🎬', color: '#f472b6' },
        { id: 'json_upload', label: 'JSON Import', icon: '📥', color: '#34d399' },
        { id: 'manual', label: 'Manual', icon: '✍️', color: '#fb923c' }
    ];

    // Get filtered quizzes based on selected source
    const getFilteredQuizzes = () => {
        if (sourceFilter === 'all') return quizzes;
        return quizzes.filter(q => q.source === sourceFilter);
    };

    // Get count for each source type
    const getSourceCount = (sourceId) => {
        if (sourceId === 'all') return quizzes.length;
        return quizzes.filter(q => q.source === sourceId).length;
    };

    const fetchLibraryStatus = async () => {
        try {
            const response = await fetchWithAuth(`${API_URL}/api/quizzes/my-library`);
            if (!response.ok) return;
            const data = await response.json();

            // Handle different response formats
            let quizzes = [];
            if (Array.isArray(data)) {
                quizzes = data;
            } else if (data.quizzes && Array.isArray(data.quizzes)) {
                quizzes = data.quizzes;
            } else if (data.library && Array.isArray(data.library)) {
                quizzes = data.library;
            } else if (data.recentlyAdded || data.completed) {
                // Combine recentlyAdded and completed arrays
                const recentlyAdded = data.recentlyAdded || [];
                const completed = data.completed || [];
                quizzes = [...recentlyAdded, ...completed];
            }

            // Create a Set of quiz IDs that are in the library
            const libraryQuizIds = new Set(quizzes.map(item => item.id || item.quiz_id));
            setInLibrary(libraryQuizIds);
        } catch (err) {
            // Silent fail - not critical
            console.error('Failed to fetch library status:', err);
        }
    };

    useEffect(() => {
        fetchQuizzes();
        fetchLibraryStatus();
    }, []);

    const fetchQuizzes = async () => {
        try {
            const response = await fetchWithAuth(`${API_URL}/api/quizzes/my-quizzes`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to fetch quizzes (${response.status})`);
            }
            const data = await response.json();

            // Sort quizzes by creation date (latest first)
            const sortedData = data.sort((a, b) => {
                const dateA = new Date(a.created_at || a.createdAt || 0);
                const dateB = new Date(b.created_at || b.createdAt || 0);
                return dateB - dateA; // Descending order (newest first)
            });

            setQuizzes(sortedData);

            // Fetch review details for rejected quizzes
            data.forEach(quiz => {
                if (quiz.status === 'rejected') {
                    fetchReviewDetails(quiz.id);
                }
            });
        } catch (err) {
            setError(`${err.message}`);
            showError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchReviewDetails = async (quizId) => {
        try {
            const response = await fetchWithAuth(`${API_URL}/api/quizzes/${quizId}/review-details`);
            if (response.ok) {
                const data = await response.json();
                if (data.comments) {
                    setReviewDetails(prev => ({ ...prev, [quizId]: data }));
                }
            }
        } catch (err) {
            console.error('Error fetching review details:', err);
        }
    };

    const handlePublish = async (quizId) => {
        try {
            const quiz = quizzes.find(q => q.id === quizId);
            const version = quiz?.version;

            const response = await fetchWithAuth(`${API_URL}/api/quizzes/${quizId}/publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ version })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));

                // Handle concurrency error
                if (await handleConcurrencyError(errorData, 'quiz', fetchQuizzes, showSuccess)) {
                    return;
                }

                throw new Error(errorData.error || 'Failed to publish quiz');
            }
            showSuccess('Quiz submitted for review!');
            fetchQuizzes(); // Refresh list
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

    const handleDelete = async (quizId) => {
        try {
            const quiz = quizzes.find(q => q.id === quizId);
            const version = quiz?.version;

            const response = await fetchWithAuth(`${API_URL}/api/quizzes/delete/${quizId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ version })
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                // Handle concurrency error
                if (await handleConcurrencyError(data, 'quiz', fetchQuizzes, showSuccess)) {
                    setDeleteConfirm(null);
                    return;
                }

                throw new Error(data.error || `Failed to delete quiz (${response.status})`);
            }

            showSuccess('Quiz deleted successfully!');
            setDeleteConfirm(null);
            fetchQuizzes(); // Refresh list
        } catch (err) {
            showError(err.message);
            setDeleteConfirm(null);
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            draft: { className: 'badge-draft', text: 'Draft', icon: '📝' },
            pending_review: { className: 'badge-pending', text: 'Pending Review', icon: '⏳' },
            approved: { className: 'badge-approved', text: 'Approved', icon: '✓' },
            rejected: { className: 'badge-rejected', text: 'Rejected', icon: '✕' }
        };
        const badge = badges[status] || badges.draft;
        return (
            <span className={`badge ${badge.className}`}>
                {badge.icon} {badge.text}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="glass-card" style={{ maxWidth: '1200px', width: '100%' }}>
                <h2>My Quizzes</h2>
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
                <h2>My Quizzes</h2>
                <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: '#ef4444',
                    background: 'rgba(239, 68, 68, 0.1)',
                    borderRadius: '12px',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    marginBottom: '2rem'
                }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
                    <div>{error}</div>
                </div>
                <button onClick={onBack} style={{ width: '100%' }}>Back to Menu</button>
            </div>
        );
    }

    // Quiz Details Modal
    if (selectedQuiz) {
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
                        ← Back to List
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
                        {getStatusBadge(selectedQuiz.status)}
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
            </div>
        );
    }


    const handleAddToHome = async (quizId) => {
        try {
            const response = await fetchWithAuth(`${API_URL}/api/quizzes/${quizId}/add-to-library`, {
                method: 'POST'
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                if (errorData.error === 'Quiz already in library') {
                    showInfo('Quiz is already in your home!');
                    // Update local state even if backend says it's already there
                    setInLibrary(prev => new Set(prev).add(quizId));
                    // Redirect to home page
                    onBack();
                    return;
                }
                throw new Error(errorData.error || 'Failed to add quiz to home');
            }
            showSuccess('Quiz added to home successfully!');
            // Update local state to reflect the quiz is now in library
            setInLibrary(prev => new Set(prev).add(quizId));
            // Redirect to home page so user can start the quiz
            onBack();
        } catch (err) {
            showError(err.message);
        }
    };

    const renderQuizCard = (quiz) => (
        <div
            key={quiz.id}
            className="hover-lift"
            onClick={() => handleViewDetails(quiz.id)}
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
                transition: 'all 0.2s ease'
            }}
        >
            {/* Status Badge */}
            <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
                {getStatusBadge(quiz.status)}
            </div>

            {/* Title */}
            <h3 style={{
                margin: 0,
                fontSize: '1.25rem',
                color: 'white',
                lineHeight: '1.4',
                paddingRight: '6rem' // Space for badge
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

            {/* Rejection Message */}
            {quiz.status === 'rejected' && reviewDetails[quiz.id]?.comments && (
                <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    fontSize: '0.85rem'
                }}>
                    <div style={{ color: '#ef4444', fontWeight: '600', marginBottom: '0.25rem' }}>
                        Rejection Reason:
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>
                        {reviewDetails[quiz.id].comments}
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    marginTop: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                }}
            >
                {/* Add to Home for unpublished quizzes */}
                {quiz.status !== 'approved' && (
                    <button
                        onClick={() => {
                            if ((quiz.questionCount || 0) === 0) {
                                showError('Cannot add to home: Quiz has no questions');
                                return;
                            }
                            handleAddToHome(quiz.id);
                        }}
                        disabled={(quiz.questionCount || 0) === 0 || inLibrary.has(quiz.id)}
                        style={{
                            background: inLibrary.has(quiz.id)
                                ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.2))'
                                : (quiz.questionCount || 0) > 0
                                    ? 'rgba(255, 255, 255, 0.1)'
                                    : 'rgba(148, 163, 184, 0.1)',
                            border: inLibrary.has(quiz.id)
                                ? '1px solid rgba(34, 197, 94, 0.3)'
                                : (quiz.questionCount || 0) > 0
                                    ? '1px solid rgba(255, 255, 255, 0.2)'
                                    : '1px solid rgba(148, 163, 184, 0.2)',
                            color: inLibrary.has(quiz.id)
                                ? '#22c55e'
                                : (quiz.questionCount || 0) > 0 ? 'white' : '#94a3b8',
                            padding: '0.75rem',
                            fontSize: '0.9rem',
                            cursor: (quiz.questionCount || 0) > 0 && !inLibrary.has(quiz.id) ? 'pointer' : 'not-allowed',
                            opacity: (quiz.questionCount || 0) > 0 ? 1 : 0.6
                        }}
                    >
                        {inLibrary.has(quiz.id)
                            ? '✓ Added to Home'
                            : `🏠 Add to Home${(quiz.questionCount || 0) === 0 ? ' (No questions)' : ''}`
                        }
                    </button>
                )}

                {/* Edit and Delete for draft and rejected */}
                {(quiz.status === 'draft' || quiz.status === 'rejected') && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={() => onEdit(quiz.id)}
                            style={{
                                flex: 1,
                                background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.2), rgba(251, 191, 36, 0.2))',
                                border: '1px solid rgba(251, 146, 60, 0.3)',
                                color: '#fb923c',
                                padding: '0.75rem',
                                fontSize: '0.9rem'
                            }}
                        >
                            ✏️ Edit
                        </button>
                        <button
                            onClick={() => setDeleteConfirm(quiz.id)}
                            style={{
                                flex: 1,
                                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.2))',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#ef4444',
                                padding: '0.75rem',
                                fontSize: '0.9rem'
                            }}
                        >
                            🗑️ Delete
                        </button>
                    </div>
                )}

                {/* Publish/Resubmit button */}
                {(quiz.status === 'draft' || quiz.status === 'rejected') && (
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => {
                                if ((quiz.questionCount || 0) < 5) {
                                    showError(`Cannot publish: Quiz needs at least 5 questions (currently has ${quiz.questionCount || 0})`);
                                    return;
                                }
                                handlePublish(quiz.id);
                            }}
                            disabled={(quiz.questionCount || 0) < 5}
                            style={{
                                width: '100%',
                                background: (quiz.questionCount || 0) >= 5
                                    ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.2))'
                                    : 'rgba(148, 163, 184, 0.2)',
                                border: (quiz.questionCount || 0) >= 5
                                    ? '1px solid rgba(34, 197, 94, 0.3)'
                                    : '1px solid rgba(148, 163, 184, 0.3)',
                                color: (quiz.questionCount || 0) >= 5 ? '#22c55e' : '#94a3b8',
                                padding: '0.75rem',
                                fontSize: '0.9rem',
                                cursor: (quiz.questionCount || 0) >= 5 ? 'pointer' : 'not-allowed',
                                opacity: (quiz.questionCount || 0) >= 5 ? 1 : 0.6
                            }}
                        >
                            📤 {quiz.status === 'rejected' ? 'Resubmit' : 'Publish'}
                            {(quiz.questionCount || 0) < 5 && ` (${quiz.questionCount || 0}/5 questions)`}
                        </button>
                    </div>
                )}

                {/* Published status */}
                {quiz.status === 'approved' && (
                    <button
                        style={{
                            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.2))',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            color: '#22c55e',
                            padding: '0.75rem',
                            fontSize: '0.9rem',
                            cursor: 'default',
                            opacity: 0.7
                        }}
                    >
                        ✓ Published
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <>
            {deleteConfirm && (
                <ConfirmDialog
                    message="Are you sure you want to delete this quiz? This action cannot be undone."
                    onConfirm={() => handleDelete(deleteConfirm)}
                    onCancel={() => setDeleteConfirm(null)}
                />
            )}

            <div className="glass-card" style={{ maxWidth: '1200px', width: '100%' }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '2rem',
                    gap: '1rem',
                    flexWrap: 'wrap'
                }}>
                    <h2 style={{ margin: 0 }}>
                        My Quizzes
                        <span style={{
                            marginLeft: '0.75rem',
                            fontSize: '1rem',
                            fontWeight: '500',
                            color: 'var(--text-muted)',
                            background: 'rgba(255, 255, 255, 0.1)',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '20px'
                        }}>
                            {quizzes.length}
                        </span>
                    </h2>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button onClick={onCreate} style={{
                            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                            padding: '0.6rem 1.2rem'
                        }}>
                            + Create New Quiz
                        </button>
                        <button onClick={onBack} style={{
                            background: 'rgba(255,255,255,0.1)',
                            padding: '0.6rem 1.2rem'
                        }}>
                            ← Back
                        </button>
                    </div>
                </div>

                {quizzes.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '4rem 2rem',
                        color: 'var(--text-muted)'
                    }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📝</div>
                        <h3>No quizzes yet</h3>
                        <p>Create your first quiz to get started!</p>
                        <button onClick={onCreate} style={{ marginTop: '1.5rem' }}>
                            + Create New Quiz
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Source Filter Tabs */}
                        <div style={{
                            display: 'flex',
                            gap: '0.5rem',
                            marginBottom: '1.5rem',
                            flexWrap: 'wrap'
                        }}>
                            {sourceFilters.map(filter => {
                                const count = getSourceCount(filter.id);
                                // Only show filter if there are quizzes of that type (except 'all')
                                if (filter.id !== 'all' && count === 0) return null;

                                const isActive = sourceFilter === filter.id;
                                return (
                                    <button
                                        key={filter.id}
                                        onClick={() => setSourceFilter(filter.id)}
                                        style={{
                                            background: isActive
                                                ? `rgba(${filter.id === 'all' ? '165, 180, 252' : '255, 255, 255'}, 0.15)`
                                                : 'rgba(255, 255, 255, 0.05)',
                                            border: isActive
                                                ? `1px solid ${filter.color}50`
                                                : '1px solid rgba(255, 255, 255, 0.1)',
                                            color: isActive ? filter.color : 'var(--text-muted)',
                                            padding: '0.5rem 1rem',
                                            borderRadius: '20px',
                                            fontSize: '0.85rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.4rem',
                                            fontWeight: isActive ? '600' : '500',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <span>{filter.icon}</span>
                                        <span>{filter.label}</span>
                                        <span style={{
                                            background: isActive
                                                ? `${filter.color}30`
                                                : 'rgba(255, 255, 255, 0.1)',
                                            padding: '0.1rem 0.5rem',
                                            borderRadius: '10px',
                                            fontSize: '0.75rem',
                                            marginLeft: '0.25rem'
                                        }}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Quiz Grid */}
                        {getFilteredQuizzes().length === 0 ? (
                            <div style={{
                                textAlign: 'center',
                                padding: '3rem 2rem',
                                color: 'var(--text-muted)'
                            }}>
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                                    {sourceFilters.find(f => f.id === sourceFilter)?.icon || '📝'}
                                </div>
                                <p>No quizzes found for this filter.</p>
                                <button
                                    onClick={() => setSourceFilter('all')}
                                    style={{ marginTop: '1rem' }}
                                >
                                    Show All Quizzes
                                </button>
                            </div>
                        ) : (
                            <div className="grid" style={{
                                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                                gap: '1.5rem'
                            }}>
                                {getFilteredQuizzes().map(quiz => renderQuizCard(quiz))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
};


export default MyQuizzes;
