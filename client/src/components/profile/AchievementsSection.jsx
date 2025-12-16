import React from 'react';
import { formatDateShort } from '../../utils/dateUtils';

const AchievementsSection = ({ achievements, loading, error }) => {
    if (loading) {
        return (
            <div className="glass-card">
                <h3 style={{ marginBottom: '1.5rem' }}>🏆 Achievements</h3>
                <div className="skeleton" style={{ height: '200px' }} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="glass-card">
                <h3 style={{ marginBottom: '1.5rem' }}>🏆 Achievements</h3>
                <div style={{ color: '#ef4444' }}>Failed to load achievements</div>
            </div>
        );
    }

    if (!achievements) return null;

    const { unlocked, locked, unlockedCount, totalAchievements } = achievements;

    return (
        <div className="glass-card">
            <h3 style={{ marginBottom: '1.5rem' }}>
                🏆 Achievements ({unlockedCount}/{totalAchievements})
            </h3>

            {/* Unlocked Achievements */}
            {unlocked && unlocked.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                    <h4 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#22c55e' }}>✓ Unlocked</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                        {unlocked.map((achievement, idx) => (
                            <div key={idx} style={{
                                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1))',
                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                padding: '1rem',
                                borderRadius: '12px',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{achievement.icon}</div>
                                <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{achievement.name}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{achievement.description}</div>
                                <div style={{ fontSize: '0.75rem', color: '#22c55e', marginTop: '0.5rem' }}>
                                    {formatDateShort(achievement.unlockedAt)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Locked Achievements */}
            {locked && locked.length > 0 && (
                <div>
                    <h4 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>🔒 Locked</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                        {locked.slice(0, 6).map((achievement, idx) => (
                            <div key={idx} style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--glass-border)',
                                padding: '1rem',
                                borderRadius: '12px',
                                textAlign: 'center',
                                opacity: 0.6
                            }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem', filter: 'grayscale(100%)' }}>
                                    {achievement.icon}
                                </div>
                                <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{achievement.name}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                    {achievement.description}
                                </div>
                                <div style={{
                                    height: '4px',
                                    background: 'rgba(255,255,255,0.1)',
                                    borderRadius: '2px',
                                    overflow: 'hidden',
                                    marginTop: '0.5rem'
                                }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${achievement.progress}%`,
                                        background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
                                        transition: 'width 0.3s ease'
                                    }} />
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                    {Math.round(achievement.progress)}% complete
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AchievementsSection;
