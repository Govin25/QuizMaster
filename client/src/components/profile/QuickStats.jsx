import React from 'react';

const QuickStats = ({ stats, loading, error }) => {
    const getScoreColor = (score) => {
        if (score >= 90) return '#22c55e';
        if (score >= 70) return '#3b82f6';
        if (score >= 50) return '#f59e0b';
        return '#ef4444';
    };

    if (loading) {
        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="skeleton" style={{ height: '100px', borderRadius: '12px' }} />
                ))}
            </div>
        );
    }

    if (error) {
        return <div style={{ color: '#ef4444', textAlign: 'center', padding: '1rem' }}>Failed to load stats</div>;
    }

    if (!stats) return null;

    const { userStats, rank } = stats;

    const quickStats = [
        {
            label: 'Total Quizzes',
            value: userStats.totalQuizzes,
            color: '#3b82f6',
            tooltip: 'Total number of quizzes you\'ve completed'
        },
        {
            label: 'Avg Score',
            value: `${Math.round(userStats.avgScore)}%`,
            color: getScoreColor(userStats.avgScore),
            tooltip: 'Your average score across all quizzes'
        },
        {
            label: 'Global Rank',
            value: `#${rank.rank || '-'}`,
            color: '#f59e0b',
            tooltip: 'Your position on the global leaderboard'
        },
        {
            label: 'Day Streak',
            value: `🔥 ${userStats.currentStreak}`,
            color: '#ef4444',
            tooltip: 'Consecutive days you\'ve taken quizzes'
        }
    ];

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
            {quickStats.map((stat, index) => (
                <div
                    key={index}
                    title={stat.tooltip}
                    style={{
                        textAlign: 'center',
                        padding: '1rem',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        transition: 'all 0.2s',
                        cursor: 'help'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                    }}
                >
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: stat.color }}>
                        {stat.value}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {stat.label}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default QuickStats;
