import React, { useEffect, useState } from 'react';
import API_URL from '../config';
import { formatDate } from '../utils/dateUtils';

const QuizAttempts = ({ quizId, userId, onViewReport, onBack }) => {
    const [attempts, setAttempts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAttempts();
    }, [quizId, userId]);

    const fetchAttempts = async () => {
        try {
            const response = await fetch(`${API_URL}/api/quizzes/${quizId}/attempts/${userId}`);
            const data = await response.json();
            setAttempts(data);
        } catch (err) {
            console.error('Error fetching attempts:', err);
        } finally {
            setLoading(false);
        }
    };



    if (loading) {
        return (
            <div className="glass-card">
                <h2>Loading Attempts...</h2>
            </div>
        );
    }

    if (attempts.length === 0) {
        return (
            <div className="glass-card" style={{ maxWidth: '800px', width: '100%' }}>
                <h2>No Attempts Found</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                    You haven't completed this quiz yet.
                </p>
                <button onClick={onBack}>Back to Quizzes</button>
            </div>
        );
    }

    const quizInfo = attempts[0]; // Get quiz info from first attempt

    return (
        <div className="glass-card" style={{ maxWidth: '1000px', width: '100%' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ marginBottom: '0.5rem' }}>{quizInfo.quiz_title}</h2>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    {quizInfo.category} • {quizInfo.difficulty} • {attempts.length} attempt{attempts.length !== 1 ? 's' : ''}
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(99, 102, 241, 0.2)'
                }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Best Score</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#6366f1' }}>
                        {Math.max(...attempts.map(a => a.score))}
                    </div>
                </div>

                <div style={{
                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1))',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(34, 197, 94, 0.2)'
                }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Best Accuracy</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#22c55e' }}>
                        {Math.max(...attempts.map(a => parseFloat(a.accuracy)))}%
                    </div>
                </div>

                <div style={{
                    background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.1), rgba(249, 115, 22, 0.1))',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(251, 146, 60, 0.2)'
                }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Total Attempts</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fb923c' }}>
                        {attempts.length}
                    </div>
                </div>
            </div>

            {/* Attempts List */}
            <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>All Attempts</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {attempts.map((attempt, index) => {
                    const isBestScore = attempt.score === Math.max(...attempts.map(a => a.score));

                    return (
                        <div
                            key={attempt.id}
                            style={{
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: isBestScore
                                    ? '2px solid rgba(251, 191, 36, 0.5)'
                                    : '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '12px',
                                padding: '1.5rem',
                                transition: 'all 0.3s ease',
                                position: 'relative'
                            }}
                        >
                            {isBestScore && (
                                <div style={{
                                    position: 'absolute',
                                    top: '12px',
                                    right: '12px',
                                    background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.2))',
                                    border: '1px solid rgba(251, 191, 36, 0.4)',
                                    color: '#fbbf24',
                                    padding: '4px 12px',
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold'
                                }}>
                                    🏆 Best Score
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                                <div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                        Attempt #{attempts.length - index}
                                    </div>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                        {formatDate(attempt.completed_at)}
                                    </div>
                                </div>
                            </div>

                            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Score</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#6366f1' }}>
                                        {attempt.score}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Accuracy</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#22c55e' }}>
                                        {attempt.accuracy}%
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Correct</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fb923c' }}>
                                        {attempt.correct_answers}/{attempt.total_questions}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => onViewReport(attempt.id)}
                                style={{
                                    width: '100%',
                                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))',
                                    border: '1px solid rgba(99, 102, 241, 0.3)',
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    color: '#a5b4fc',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(139, 92, 246, 0.3))';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))';
                                }}
                            >
                                📊 View Detailed Report
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Back Button */}
            <button
                onClick={onBack}
                style={{ marginTop: '2rem', width: '100%', marginLeft: '1rem' }}
            >
                Back to Quizzes
            </button>
        </div>
    );
};

export default QuizAttempts;
