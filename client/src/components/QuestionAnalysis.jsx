import React, { useEffect, useState } from 'react';
import API_URL from '../config';
import { formatDate } from '../utils/dateUtils';

const QuestionAnalysis = ({ question, userId, onClose }) => {
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalysis();
    }, [question.id]);

    const fetchAnalysis = async () => {
        try {
            const response = await fetch(
                `${API_URL}/api/quizzes/questions/${question.id}/analysis?userId=${userId}`
            );
            const data = await response.json();
            setAnalysis(data);
        } catch (err) {
            console.error('Error fetching analysis:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '1rem'
            }}
            onClick={onClose}
        >
            <div
                className="glass-card"
                style={{
                    maxWidth: '700px',
                    width: '100%',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    position: 'relative'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        fontSize: '1.2rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                        e.target.style.background = 'rgba(239, 68, 68, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.background = 'rgba(239, 68, 68, 0.2)';
                    }}
                >
                    ✕
                </button>

                <h2 style={{ marginBottom: '1.5rem', paddingRight: '3rem' }}>Question Analysis</h2>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <div style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>Loading analysis...</div>
                    </div>
                ) : analysis ? (
                    <>
                        {/* Question Details */}
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            padding: '1.5rem',
                            borderRadius: '12px',
                            marginBottom: '1.5rem'
                        }}>
                            <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                                Question
                            </h3>
                            <p style={{ fontSize: '1.1rem', lineHeight: '1.6' }}>
                                {analysis.question.question_text}
                            </p>

                            {analysis.question.options && (
                                <div style={{ marginTop: '1rem' }}>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                        Options:
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {analysis.question.options.map((option, idx) => (
                                            <div
                                                key={idx}
                                                style={{
                                                    padding: '0.75rem',
                                                    background: option === analysis.question.correct_answer
                                                        ? 'rgba(34, 197, 94, 0.1)'
                                                        : 'rgba(255, 255, 255, 0.03)',
                                                    border: option === analysis.question.correct_answer
                                                        ? '1px solid rgba(34, 197, 94, 0.3)'
                                                        : '1px solid rgba(255, 255, 255, 0.1)',
                                                    borderRadius: '6px',
                                                    fontSize: '0.95rem'
                                                }}
                                            >
                                                {option}
                                                {option === analysis.question.correct_answer && (
                                                    <span style={{ marginLeft: '0.5rem', color: '#22c55e' }}>✓</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Your Performance */}
                        {analysis.userPerformance && analysis.userPerformance.length > 0 && (
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                padding: '1.5rem',
                                borderRadius: '12px',
                                marginBottom: '1.5rem'
                            }}>
                                <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                    Your Performance
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {analysis.userPerformance.map((attempt, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                padding: '1rem',
                                                background: attempt.is_correct
                                                    ? 'rgba(34, 197, 94, 0.1)'
                                                    : 'rgba(239, 68, 68, 0.1)',
                                                border: `1px solid ${attempt.is_correct ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                                borderRadius: '8px'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <span style={{
                                                    fontSize: '0.85rem',
                                                    color: attempt.is_correct ? '#22c55e' : '#ef4444',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {attempt.is_correct ? '✓ Correct' : '✗ Incorrect'}
                                                </span>
                                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                    {attempt.time_taken_seconds}s
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '0.9rem' }}>
                                                Your answer: <strong>{attempt.user_answer}</strong>
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                                {formatDate(attempt.attempted_at)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Overall Statistics */}
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            padding: '1.5rem',
                            borderRadius: '12px',
                            marginBottom: '1.5rem'
                        }}>
                            <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                Overall Statistics
                            </h3>
                            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                                <div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                        Total Attempts
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#6366f1' }}>
                                        {analysis.statistics.totalAttempts}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                        Success Rate
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#22c55e' }}>
                                        {analysis.statistics.successRate}%
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                        Avg Time
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fb923c' }}>
                                        {analysis.statistics.averageTime}s
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Insights (Placeholder for future AI analysis) */}
                        <div style={{
                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))',
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                            padding: '1.5rem',
                            borderRadius: '12px'
                        }}>
                            <h3 style={{ fontSize: '1rem', color: '#a5b4fc', marginBottom: '1rem' }}>
                                💡 Insights
                            </h3>
                            <p style={{ fontSize: '0.95rem', lineHeight: '1.6', color: 'var(--text-muted)' }}>
                                {analysis.insights.explanation}
                            </p>
                            <div style={{
                                marginTop: '1rem',
                                padding: '1rem',
                                background: 'rgba(255, 255, 255, 0.05)',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                color: 'var(--text-muted)'
                            }}>
                                🚀 <strong>Coming Soon:</strong> AI-powered explanations, common mistakes analysis, and personalized learning recommendations will be available here.
                            </div>
                        </div>
                    </>
                ) : (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <div style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>
                            Unable to load analysis
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuestionAnalysis;
