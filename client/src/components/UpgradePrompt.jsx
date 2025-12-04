import React from 'react';

const UpgradePrompt = ({ onClose, limitType, currentUsage, limit, tier }) => {
    const getTitle = () => {
        switch (limitType) {
            case 'aiQuizGeneration':
                return 'AI Quiz Generation Limit Reached';
            case 'documentQuizGeneration':
                return 'Document Generation Limit Reached';
            case 'videoQuizGeneration':
                return 'Video Generation Limit Reached';
            default:
                return 'Monthly Limit Reached';
        }
    };

    const getMessage = () => {
        const typeName = limitType === 'aiQuizGeneration' ? 'AI quiz generations'
            : limitType === 'documentQuizGeneration' ? 'document generations'
                : 'video generations';

        return `You've used all ${limit} ${typeName} for this month on your ${tier.charAt(0).toUpperCase() + tier.slice(1)} plan.`;
    };

    const upgradeTiers = tier === 'free'
        ? [
            { name: 'Pro', price: '$9/month', aiLimit: 50, docLimit: 30, videoLimit: 20 },
            { name: 'Premium', price: '$19/month', aiLimit: 200, docLimit: 100, videoLimit: 75 }
        ]
        : tier === 'pro'
            ? [{ name: 'Premium', price: '$19/month', aiLimit: 200, docLimit: 100, videoLimit: 75 }]
            : [];

    return (
        <div className="auth-modal-overlay" onClick={onClose}>
            <div className="auth-modal-content" onClick={(e) => e.stopPropagation()} style={{
                maxWidth: '600px'
            }}>
                {/* Close Button */}
                <button
                    className="modal-close"
                    onClick={onClose}
                    aria-label="Close"
                >
                    ×
                </button>

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚀</div>
                    <h2 style={{ margin: 0, marginBottom: '0.5rem' }}>{getTitle()}</h2>
                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                        {getMessage()}
                    </p>
                </div>

                {/* Current Usage */}
                <div style={{
                    padding: '1rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '12px',
                    marginBottom: '2rem',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        Current Usage
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: '#ef4444' }}>
                        {currentUsage} / {limit}
                    </div>
                </div>

                {/* Upgrade Options */}
                {upgradeTiers.length > 0 && (
                    <>
                        <h3 style={{ marginBottom: '1rem', textAlign: 'center' }}>Upgrade to Continue</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                            {upgradeTiers.map((upgradeTier) => (
                                <div
                                    key={upgradeTier.name}
                                    style={{
                                        padding: '1.5rem',
                                        background: 'rgba(139, 92, 246, 0.1)',
                                        border: '1px solid rgba(139, 92, 246, 0.3)',
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)';
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                >
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '1rem'
                                    }}>
                                        <div>
                                            <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>
                                                {upgradeTier.name}
                                            </div>
                                            <div style={{ fontSize: '1.1rem', color: '#c084fc', fontWeight: '600' }}>
                                                {upgradeTier.price}
                                            </div>
                                        </div>
                                        <div style={{
                                            padding: '0.5rem 1rem',
                                            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                                            borderRadius: '8px',
                                            fontSize: '0.9rem',
                                            fontWeight: '600'
                                        }}>
                                            Coming Soon
                                        </div>
                                    </div>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(3, 1fr)',
                                        gap: '0.75rem',
                                        fontSize: '0.85rem',
                                        color: 'var(--text-muted)'
                                    }}>
                                        <div>
                                            <div style={{ fontWeight: '600', color: 'white' }}>{upgradeTier.aiLimit}</div>
                                            <div>AI Quizzes</div>
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '600', color: 'white' }}>{upgradeTier.docLimit}</div>
                                            <div>Documents</div>
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '600', color: 'white' }}>{upgradeTier.videoLimit}</div>
                                            <div>Videos</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* Alternative Action */}
                <div style={{
                    padding: '1rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        Or create quizzes manually
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Manual quiz creation is always unlimited on all plans
                    </div>
                </div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    style={{
                        width: '100%',
                        marginTop: '1.5rem',
                        padding: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '0.9rem',
                        cursor: 'pointer'
                    }}
                >
                    Close
                </button>
            </div>
        </div>
    );
};

export default UpgradePrompt;
