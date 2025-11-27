import React, { useEffect, useState } from 'react';
import API_URL from '../config';
import QuestionAnalysis from './QuestionAnalysis';
import { useAuth } from '../context/AuthContext';

const QuizReport = ({ resultId, onBackToMenu, onBackToAttempts }) => {
    const { user } = useAuth();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedQuestion, setSelectedQuestion] = useState(null);
    const [showAnalysis, setShowAnalysis] = useState(false);

    useEffect(() => {
        fetchReport();
    }, [resultId]);

    const fetchReport = async () => {
        try {
            const response = await fetch(`${API_URL}/api/quizzes/results/${resultId}/report`);
            const data = await response.json();
            setReport(data);
        } catch (err) {
            console.error('Error fetching report:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAnalysisClick = (question) => {
        setSelectedQuestion(question);
        setShowAnalysis(true);
    };

    const formatTime = (seconds) => {
        if (seconds < 60) return `${seconds}s`;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    if (loading) {
        return (
            <div className="glass-card">
                <h2>Loading Report...</h2>
            </div>
        );
    }

    if (!report) {
        return (
            <div className="glass-card">
                <h2>Report not found</h2>
                <button onClick={onBackToMenu}>Back to Menu</button>
            </div>
        );
    }

    const accuracy = ((report.correctAnswers / report.totalQuestions) * 100).toFixed(1);

    return (
        <>
            <div className="glass-card" style={{ maxWidth: '1000px', width: '100%' }}>
                {/* Sticky Navigation Buttons */}
                <div style={{
                    position: 'sticky',
                    top: '80px',
                    zIndex: 50,
                    background: 'rgba(10, 10, 20, 0.95)',
                    backdropFilter: 'blur(10px)',
                    padding: '0.75rem',
                    margin: '-1.5rem -1.5rem 1.5rem -1.5rem',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    gap: '0.5rem',
                    flexWrap: 'wrap'
                }}>
                    {onBackToAttempts && (
                        <button
                            onClick={() => onBackToAttempts(report.quiz_id)}
                            style={{
                                padding: '0.5rem 1rem',
                                fontSize: '0.9rem',
                                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                flex: '1',
                                minWidth: '140px'
                            }}
                        >
                            ← Back to Attempts
                        </button>
                    )}
                    <button
                        onClick={onBackToMenu}
                        style={{
                            padding: '0.5rem 1rem',
                            fontSize: '0.9rem',
                            flex: '1',
                            minWidth: '140px'
                        }}
                    >
                        ← Back to Home
                    </button>
                </div>

                {/* Header */}
                <div style={{ marginBottom: '2rem' }}>
                    <h2 style={{ marginBottom: '0.5rem' }}>{report.quiz_title}</h2>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        {report.category} • {report.difficulty} • Completed by {report.username}
                    </div>
                </div>

                {/* Overall Statistics */}
                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        border: '1px solid rgba(99, 102, 241, 0.2)'
                    }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Final Score</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#6366f1' }}>
                            {report.score} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ {report.totalQuestions * 10}</span>
                        </div>
                    </div>

                    <div style={{
                        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1))',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        border: '1px solid rgba(34, 197, 94, 0.2)'
                    }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Accuracy</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#22c55e' }}>
                            {accuracy}%
                        </div>
                    </div>

                    <div style={{
                        background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.1), rgba(249, 115, 22, 0.1))',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        border: '1px solid rgba(251, 146, 60, 0.2)'
                    }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Correct Answers</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fb923c' }}>
                            {report.correctAnswers} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ {report.totalQuestions}</span>
                        </div>
                    </div>

                    <div style={{
                        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(147, 51, 234, 0.1))',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        border: '1px solid rgba(168, 85, 247, 0.2)'
                    }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Total Time</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#a855f7' }}>
                            {formatTime(report.totalTime)}
                        </div>
                    </div>
                </div>

                {/* Question Breakdown */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Question-by-Question Breakdown</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {report.attempts.map((attempt, index) => {
                        const isUnattempted = attempt.status === 'unattempted';
                        const isCorrect = attempt.status === 'correct';

                        let statusColor = '#ef4444'; // Red for incorrect
                        let statusBg = 'rgba(239, 68, 68, 0.1)';
                        let statusBorder = 'rgba(239, 68, 68, 0.3)';
                        let statusText = '✗ Incorrect';

                        if (isCorrect) {
                            statusColor = '#22c55e';
                            statusBg = 'rgba(34, 197, 94, 0.1)';
                            statusBorder = 'rgba(34, 197, 94, 0.3)';
                            statusText = '✓ Correct';
                        } else if (isUnattempted) {
                            statusColor = '#f59e0b'; // Amber for unattempted
                            statusBg = 'rgba(245, 158, 11, 0.1)';
                            statusBorder = 'rgba(245, 158, 11, 0.3)';
                            statusText = '○ Unattempted';
                        }

                        return (
                            <div
                                key={attempt.id}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: `2px solid ${statusBorder}`,
                                    borderRadius: '12px',
                                    padding: '1.5rem',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                {/* Question Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                            <span style={{
                                                fontSize: '0.85rem',
                                                fontWeight: 'bold',
                                                color: 'var(--text-muted)',
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '6px'
                                            }}>
                                                Question {index + 1}
                                            </span>
                                            <span style={{
                                                fontSize: '0.85rem',
                                                fontWeight: 'bold',
                                                color: statusColor,
                                                background: statusBg,
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '6px'
                                            }}>
                                                {statusText}
                                            </span>
                                            <span style={{
                                                fontSize: '0.85rem',
                                                color: 'var(--text-muted)',
                                                marginLeft: 'auto'
                                            }}>
                                                ⏱ {formatTime(attempt.time_taken_seconds)}
                                            </span>
                                        </div>
                                        <p style={{ fontSize: '1.1rem', marginBottom: '1rem', lineHeight: '1.5' }}>
                                            {attempt.question_text}
                                        </p>
                                    </div>
                                </div>

                                {/* Answers Section */}
                                <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1rem' }}>
                                    {/* Your Answer */}
                                    <div style={{
                                        background: statusBg,
                                        border: `1px solid ${statusBorder}`,
                                        borderRadius: '8px',
                                        padding: '1rem'
                                    }}>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                            Your Answer
                                        </div>
                                        <div style={{ fontSize: '1rem', fontWeight: '500', color: isUnattempted ? 'var(--text-muted)' : 'inherit', fontStyle: isUnattempted ? 'italic' : 'normal' }}>
                                            {isUnattempted ? 'Not Attempted' : attempt.user_answer}
                                        </div>
                                    </div>

                                    {/* Correct Answer (if wrong or unattempted) */}
                                    {!isCorrect && (
                                        <div style={{
                                            background: 'rgba(34, 197, 94, 0.1)',
                                            border: '1px solid rgba(34, 197, 94, 0.3)',
                                            borderRadius: '8px',
                                            padding: '1rem'
                                        }}>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                                Correct Answer
                                            </div>
                                            <div style={{ fontSize: '1rem', fontWeight: '500', color: '#22c55e' }}>
                                                {attempt.correct_answer}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Analysis Button */}
                                <button
                                    onClick={() => handleAnalysisClick(attempt)}
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
                                    📊 View Detailed Analysis
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Back Button */}
                <button
                    onClick={onBackToMenu}
                    style={{ marginTop: '2rem', width: '100%' }}
                >
                    Back to Home
                </button>
            </div>

            {/* Analysis Modal */}
            {showAnalysis && selectedQuestion && (
                <QuestionAnalysis
                    question={selectedQuestion}
                    userId={user.id}
                    onClose={() => setShowAnalysis(false)}
                />
            )}
        </>
    );
};

export default QuizReport;
