import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import API_URL from '../config';
import ConfirmDialog from './ConfirmDialog';
import DocumentQuizGenerator from './DocumentQuizGenerator';

const MyQuizzes = ({ onEdit, onCreate, onBack }) => {
    const { token } = useAuth();
    const { showSuccess, showError, showInfo } = useToast();
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedQuiz, setSelectedQuiz] = useState(null);
    const [reviewDetails, setReviewDetails] = useState({});
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [showDocumentGenerator, setShowDocumentGenerator] = useState(false);

    useEffect(() => {
        fetchQuizzes();
    }, []);

    const fetchQuizzes = async () => {
        try {
            const response = await fetch(`${API_URL}/api/quizzes/my-quizzes`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to fetch quizzes (${response.status})`);
            }
            const data = await response.json();
            setQuizzes(data);

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
            const response = await fetch(`${API_URL}/api/quizzes/${quizId}/review-details`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
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
            const response = await fetch(`${API_URL}/api/quizzes/${quizId}/publish`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
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

    const handleDelete = async (quizId) => {
        try {
            const response = await fetch(`${API_URL}/api/quizzes/delete/${quizId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
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
            const response = await fetch(`${API_URL}/api/quizzes/${quizId}/add-to-library`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                if (errorData.error === 'Quiz already in library') {
                    showInfo('Quiz is already in your home!');
                    return;
                }
                throw new Error(errorData.error || 'Failed to add quiz to home');
            }
            showSuccess('Quiz added to home successfully!');
        } catch (err) {
            showError(err.message);
        }
    };

    const renderQuizCard = (quiz) => (
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
                        disabled={(quiz.questionCount || 0) === 0}
                        style={{
                            background: (quiz.questionCount || 0) > 0
                                ? 'rgba(255, 255, 255, 0.1)'
                                : 'rgba(148, 163, 184, 0.1)',
                            border: (quiz.questionCount || 0) > 0
                                ? '1px solid rgba(255, 255, 255, 0.2)'
                                : '1px solid rgba(148, 163, 184, 0.2)',
                            color: (quiz.questionCount || 0) > 0 ? 'white' : '#94a3b8',
                            padding: '0.75rem',
                            fontSize: '0.9rem',
                            cursor: (quiz.questionCount || 0) > 0 ? 'pointer' : 'not-allowed',
                            opacity: (quiz.questionCount || 0) > 0 ? 1 : 0.6
                        }}
                    >
                        🏠 Add to Home (Preview)
                        {(quiz.questionCount || 0) === 0 && ' (No questions)'}
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

            {showDocumentGenerator && (
                <DocumentQuizGenerator
                    onClose={() => setShowDocumentGenerator(false)}
                    onQuizCreated={() => {
                        setShowDocumentGenerator(false);
                        fetchQuizzes();
                    }}
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
                    <h2 style={{ margin: 0 }}>My Quizzes</h2>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button onClick={() => setShowDocumentGenerator(true)} style={{
                            background: 'linear-gradient(135deg, #c084fc, #a855f7)',
                            padding: '0.6rem 1.2rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            📄✨ Generate from Document
                        </button>
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
                        {/* AI Generated Quizzes Section */}
                        {quizzes.some(q => q.source === 'ai') && (
                            <div style={{ marginBottom: '3rem' }}>
                                <h3 style={{
                                    marginBottom: '1.5rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    color: '#c084fc'
                                }}>
                                    ✨ AI Quizzes
                                </h3>
                                <div className="grid" style={{
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                                    gap: '1.5rem'
                                }}>
                                    {quizzes.filter(q => q.source === 'ai').map(quiz => renderQuizCard(quiz))}
                                </div>
                            </div>
                        )}

                        {/* Manual Quizzes Section */}
                        {quizzes.some(q => q.source !== 'ai') && (
                            <div>
                                {quizzes.some(q => q.source === 'ai') && (
                                    <h3 style={{ marginBottom: '1.5rem' }}>✍️ My Created Quizzes</h3>
                                )}
                                <div className="grid" style={{
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                                    gap: '1.5rem'
                                }}>
                                    {quizzes.filter(q => q.source !== 'ai').map(quiz => renderQuizCard(quiz))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
};


export default MyQuizzes;
