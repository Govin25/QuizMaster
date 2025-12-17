import React, { useState } from 'react';

const REPORT_REASONS = [
    { id: 'spoilers', label: 'Contains Spoilers', icon: '🔮' },
    { id: 'inappropriate', label: 'Inappropriate Content', icon: '🚫' },
    { id: 'spam', label: 'Spam', icon: '📧' },
    { id: 'harassment', label: 'Harassment', icon: '⚠️' },
    { id: 'other', label: 'Other', icon: '📝' },
];

const ReportModal = ({ isOpen, onClose, onSubmit, commentId }) => {
    const [selectedReason, setSelectedReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!selectedReason) return;

        setSubmitting(true);
        try {
            await onSubmit(commentId, selectedReason);
            onClose();
        } catch (err) {
            console.error('Failed to submit report:', err);
        } finally {
            setSubmitting(false);
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
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '1rem',
                animation: 'fadeIn 0.2s ease',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.98), rgba(15, 23, 42, 0.98))',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                    padding: '2rem',
                    maxWidth: '450px',
                    width: '100%',
                    animation: 'slideUp 0.3s ease',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                    <div style={{
                        fontSize: '2.5rem',
                        marginBottom: '0.5rem',
                    }}>
                        🚩
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Report Comment</h3>
                    <p style={{
                        margin: '0.5rem 0 0',
                        color: 'var(--text-muted)',
                        fontSize: '0.9rem'
                    }}>
                        Help us keep the community safe
                    </p>
                </div>

                {/* Reason Selection */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    marginBottom: '1.5rem',
                }}>
                    {REPORT_REASONS.map((reason) => (
                        <button
                            key={reason.id}
                            onClick={() => setSelectedReason(reason.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '1rem',
                                background: selectedReason === reason.id
                                    ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.2))'
                                    : 'rgba(255, 255, 255, 0.05)',
                                border: selectedReason === reason.id
                                    ? '1px solid rgba(239, 68, 68, 0.5)'
                                    : '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '12px',
                                color: 'white',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                textAlign: 'left',
                            }}
                        >
                            <span style={{ fontSize: '1.25rem' }}>{reason.icon}</span>
                            <span style={{ fontWeight: '500' }}>{reason.label}</span>
                        </button>
                    ))}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        onClick={onClose}
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px',
                            color: 'white',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!selectedReason || submitting}
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            background: selectedReason
                                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                                : 'rgba(255, 255, 255, 0.1)',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'white',
                            fontWeight: '600',
                            cursor: selectedReason ? 'pointer' : 'not-allowed',
                            opacity: selectedReason ? 1 : 0.5,
                            transition: 'all 0.2s ease',
                        }}
                    >
                        {submitting ? 'Reporting...' : 'Submit Report'}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default ReportModal;
