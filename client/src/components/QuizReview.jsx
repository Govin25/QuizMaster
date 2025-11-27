import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import API_URL from '../config';

const QuizReview = ({ onBack }) => {
    const { token } = useAuth();
    const { showSuccess, showError } = useToast();
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedQuiz, setSelectedQuiz] = useState(null);
    const [currentQuizDetails, setCurrentQuizDetails] = useState(null);
    const [reviewComment, setReviewComment] = useState('');

    useEffect(() => {
        fetchPendingQuizzes();
    }, []);

    const fetchPendingQuizzes = async () => {
        try {
            // Fetch all quizzes and filter for pending_review status
            const response = await fetch(`${API_URL}/api/quizzes`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) throw new Error('Failed to fetch quizzes');
            const data = await response.json();
            const pending = data.filter(q => q.status === 'pending_review');
            setQuizzes(pending);
        } catch (err) {
            showError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const startReview = async (quizId) => {
        try {
            setSelectedQuiz(quizId);
            const response = await fetch(`${API_URL}/api/quizzes/${quizId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) throw new Error('Failed to fetch quiz details');
            const data = await response.json();
            setCurrentQuizDetails(data);
        } catch (err) {
            showError(err.message);
            setSelectedQuiz(null);
        }
    };

    const handleReview = async (quizId, status) => {
        try {
            const response = await fetch(`${API_URL}/api/quizzes/${quizId}/review`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status, comments: reviewComment })
            });
            if (!response.ok) throw new Error('Failed to review quiz');
            showSuccess(`Quiz ${status === 'approved' ? 'approved' : 'rejected'} successfully!`);
            setSelectedQuiz(null);
            setCurrentQuizDetails(null);
            setReviewComment('');
            fetchPendingQuizzes();
        } catch (err) {
            showError(err.message);
        }
    };

    if (loading) {
        return (
            <div className="glass-card" style={{ maxWidth: '1200px', width: '100%' }}>
                <h2>Quiz Review Dashboard</h2>
                <div className="skeleton" style={{ height: '200px' }} />
            </div>
        );
    }

    return (
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
                <div>
                    <h2 style={{ margin: 0 }}>Quiz Review Dashboard</h2>
                    <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-muted)' }}>
                        {quizzes.length} quiz{quizzes.length !== 1 ? 'zes' : ''} pending review
                    </p>
                </div>
                <button onClick={onBack} style={{
                    background: 'rgba(255,255,255,0.1)',
                    padding: '0.6rem 1.2rem'
                }}>
                    ← Back
                </button>
            </div>

            {/* Quiz List */}
            {quizzes.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '4rem 2rem',
                    color: 'var(--text-muted)'
                }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✓</div>
                    <h3>All caught up!</h3>
                    <p>No quizzes pending review at the moment.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {quizzes.map(quiz => (
                        <div
                            key={quiz.id}
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                borderRadius: '16px',
                                padding: '1.5rem',
                                border: '1px solid var(--glass-border)'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '1rem', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ margin: '0 0 0.5rem 0' }}>{quiz.title}</h3>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                                        <span className="badge" style={{
                                            background: 'rgba(99, 102, 241, 0.2)',
                                            border: '1px solid rgba(99, 102, 241, 0.3)',
                                            color: '#a5b4fc'
                                        }}>
                                            {quiz.category}
                                        </span>
                                        <span className="badge" style={{
                                            background: 'rgba(251, 146, 60, 0.2)',
                                            border: '1px solid rgba(251, 146, 60, 0.3)',
                                            color: '#fb923c'
                                        }}>
                                            {quiz.difficulty}
                                        </span>
                                        <span className="badge" style={{
                                            background: 'rgba(148, 163, 184, 0.2)',
                                            border: '1px solid rgba(148, 163, 184, 0.3)',
                                            color: '#94a3b8'
                                        }}>
                                            {quiz.questionCount || 0} Questions
                                        </span>
                                    </div>
                                    {selectedQuiz === quiz.id && (
                                        <div style={{ marginTop: '1rem' }}>
                                            {/* Questions Preview */}
                                            {currentQuizDetails && (
                                                <div style={{ marginBottom: '1.5rem' }}>
                                                    <h4 style={{ marginBottom: '1rem' }}>Questions Preview</h4>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                        {currentQuizDetails.questions?.map((q, idx) => (
                                                            <div key={q.id || idx} style={{
                                                                background: 'rgba(0,0,0,0.2)',
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
                                            )}

                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                                                Review Comments (optional)
                                            </label>
                                            <textarea
                                                value={reviewComment}
                                                onChange={(e) => setReviewComment(e.target.value)}
                                                placeholder="Add feedback for the creator..."
                                                style={{
                                                    width: '100%',
                                                    minHeight: '80px',
                                                    background: 'rgba(15, 23, 42, 0.5)',
                                                    border: '1px solid var(--glass-border)',
                                                    borderRadius: '8px',
                                                    padding: '0.75rem',
                                                    color: 'white',
                                                    fontSize: '0.95rem',
                                                    resize: 'vertical'
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column', minWidth: '150px' }}>
                                    {selectedQuiz === quiz.id ? (
                                        <>
                                            <button
                                                onClick={() => handleReview(quiz.id, 'approved')}
                                                style={{
                                                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(16, 185, 129, 0.3))',
                                                    border: '1px solid rgba(34, 197, 94, 0.5)',
                                                    color: '#22c55e',
                                                    padding: '0.75rem'
                                                }}
                                            >
                                                ✓ Approve
                                            </button>
                                            <button
                                                onClick={() => handleReview(quiz.id, 'rejected')}
                                                style={{
                                                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(220, 38, 38, 0.3))',
                                                    border: '1px solid rgba(239, 68, 68, 0.5)',
                                                    color: '#ef4444',
                                                    padding: '0.75rem'
                                                }}
                                            >
                                                ✕ Reject
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedQuiz(null);
                                                    setCurrentQuizDetails(null);
                                                    setReviewComment('');
                                                }}
                                                style={{
                                                    background: 'rgba(255,255,255,0.1)',
                                                    padding: '0.75rem'
                                                }}
                                            >
                                                Cancel
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => startReview(quiz.id)}
                                            style={{
                                                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                                                padding: '0.75rem'
                                            }}
                                        >
                                            Review
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default QuizReview;
