import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API_URL from '../config';

const UsageQuota = ({ generationType, compact = false }) => {
    const { fetchWithAuth } = useAuth();
    const [usage, setUsage] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUsage();
    }, []);

    const fetchUsage = async () => {
        try {
            const response = await fetchWithAuth(`${API_URL}/api/usage/current`);
            if (response.ok) {
                const data = await response.json();
                setUsage(data.data);
            }
        } catch (error) {
            console.error('Error fetching usage:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={{
                padding: '1rem',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                border: '1px solid var(--glass-border)'
            }}>
                <div className="skeleton" style={{ height: '60px', width: '100%' }} />
            </div>
        );
    }

    if (!usage) return null;

    const getUsageData = () => {
        switch (generationType) {
            case 'aiQuizGeneration':
                return usage.usage.aiQuiz;
            case 'documentQuizGeneration':
                return usage.usage.documentQuiz;
            case 'videoQuizGeneration':
                return usage.usage.videoQuiz;
            default:
                return null;
        }
    };

    const getLabel = () => {
        switch (generationType) {
            case 'aiQuizGeneration':
                return 'AI Quiz Generations';
            case 'documentQuizGeneration':
                return 'Document Generations';
            case 'videoQuizGeneration':
                return 'Video Generations';
            default:
                return 'Generations';
        }
    };

    const usageData = getUsageData();
    if (!usageData) return null;

    const percentage = (usageData.used / usageData.limit) * 100;
    const isNearLimit = percentage >= 80;
    const isAtLimit = usageData.remaining === 0;

    const getStatusColor = () => {
        if (isAtLimit) return '#ef4444';
        if (isNearLimit) return '#f59e0b';
        return '#22c55e';
    };

    if (compact) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                border: `1px solid ${isAtLimit ? 'rgba(239, 68, 68, 0.3)' : 'var(--glass-border)'}`
            }}>
                <div style={{ flex: 1 }}>
                    <div style={{
                        fontSize: '0.85rem',
                        color: 'var(--text-muted)',
                        marginBottom: '0.25rem'
                    }}>
                        {getLabel()} this month
                    </div>
                    <div style={{
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        color: getStatusColor()
                    }}>
                        {usageData.used} / {usageData.limit}
                        <span style={{
                            fontSize: '0.85rem',
                            color: 'var(--text-muted)',
                            marginLeft: '0.5rem'
                        }}>
                            ({usageData.remaining} left)
                        </span>
                    </div>
                </div>
                {isAtLimit && (
                    <button
                        onClick={() => window.location.href = '#pricing'}
                        style={{
                            padding: '0.5rem 1rem',
                            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                            border: 'none',
                            borderRadius: '6px',
                            color: 'white',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        Upgrade
                    </button>
                )}
            </div>
        );
    }

    return (
        <div style={{
            padding: '1.5rem',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            border: `1px solid ${isAtLimit ? 'rgba(239, 68, 68, 0.3)' : 'var(--glass-border)'}`,
            marginBottom: '1.5rem'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem'
            }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{getLabel()}</h3>
                    <div style={{
                        fontSize: '0.85rem',
                        color: 'var(--text-muted)',
                        marginTop: '0.25rem'
                    }}>
                        {usage.tier.charAt(0).toUpperCase() + usage.tier.slice(1)} Plan • {usage.month}
                    </div>
                </div>
                <div style={{
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    color: getStatusColor()
                }}>
                    {usageData.used}/{usageData.limit}
                </div>
            </div>

            {/* Progress Bar */}
            <div style={{
                width: '100%',
                height: '8px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '4px',
                overflow: 'hidden',
                marginBottom: '0.75rem'
            }}>
                <div style={{
                    width: `${Math.min(percentage, 100)}%`,
                    height: '100%',
                    background: getStatusColor(),
                    transition: 'width 0.3s ease',
                    borderRadius: '4px'
                }} />
            </div>

            {/* Status Message */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{
                    fontSize: '0.9rem',
                    color: getStatusColor(),
                    fontWeight: '500'
                }}>
                    {isAtLimit
                        ? '❌ Limit reached'
                        : isNearLimit
                            ? `⚠️ ${usageData.remaining} remaining`
                            : `✅ ${usageData.remaining} remaining`
                    }
                </div>
                {isAtLimit && (
                    <button
                        onClick={() => window.location.href = '#pricing'}
                        style={{
                            padding: '0.5rem 1.25rem',
                            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        Upgrade Plan
                    </button>
                )}
            </div>
        </div>
    );
};

export default UsageQuota;
