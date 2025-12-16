import React from 'react';
import { formatDateShort } from '../../utils/dateUtils';

const RecentActivitySection = ({ activity, loading, error }) => {
    const getScoreColor = (score) => {
        if (score >= 90) return '#22c55e';
        if (score >= 70) return '#3b82f6';
        if (score >= 50) return '#f59e0b';
        return '#ef4444';
    };

    if (loading) {
        return (
            <div className="glass-card">
                <h3 style={{ marginBottom: '1.5rem' }}>📝 Recent Activity</h3>
                <div className="skeleton" style={{ height: '200px' }} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="glass-card">
                <h3 style={{ marginBottom: '1.5rem' }}>📝 Recent Activity</h3>
                <div style={{ color: '#ef4444' }}>Failed to load activity</div>
            </div>
        );
    }

    if (!activity || !activity.recentAttempts || activity.recentAttempts.length === 0) return null;

    return (
        <div className="glass-card">
            <h3 style={{ marginBottom: '1.5rem' }}>📝 Recent Activity</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {activity.recentAttempts.map((attempt, idx) => (
                    <div key={idx} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1rem',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '8px',
                        border: '1px solid var(--glass-border)'
                    }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{attempt.quizTitle}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                {attempt.category} • {attempt.difficulty} • {attempt.questionCount} questions
                            </div>
                        </div>
                        <div style={{
                            fontSize: '1.25rem',
                            fontWeight: 'bold',
                            color: getScoreColor(attempt.score),
                            marginRight: '1rem'
                        }}>
                            {attempt.score}%
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', minWidth: '100px', textAlign: 'right' }}>
                            {formatDateShort(attempt.completed_at)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RecentActivitySection;
