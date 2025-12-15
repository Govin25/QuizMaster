import React from 'react';

const ConfirmDialog = ({
    isOpen,  // New prop: control visibility
    onClose, // New prop: alternative to onCancel
    onConfirm,
    onCancel, // Old prop: kept for backwards compatibility
    message,
    title,   // New prop: custom title
    confirmText, // New prop: custom confirm button text
    confirmStyle // New prop: 'danger' or default
}) => {
    // Support both old and new API
    const handleCancel = onClose || onCancel;
    const dialogTitle = title || 'Confirm Deletion';
    const buttonText = confirmText || 'Delete';
    const isDanger = confirmStyle === 'danger' || !confirmStyle;

    // Don't render if isOpen is explicitly false
    if (isOpen === false) {
        return null;
    }

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <div style={{
                background: 'rgba(15, 23, 42, 0.95)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '16px',
                padding: '2rem',
                maxWidth: '400px',
                width: '90%',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                animation: 'slideUp 0.3s ease-out'
            }}>
                <div style={{
                    fontSize: '3rem',
                    textAlign: 'center',
                    marginBottom: '1rem'
                }}>
                    ⚠️
                </div>
                <h3 style={{
                    margin: '0 0 1rem 0',
                    textAlign: 'center',
                    color: isDanger ? '#ef4444' : 'var(--primary)'
                }}>
                    {dialogTitle}
                </h3>
                <p style={{
                    margin: '0 0 2rem 0',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    lineHeight: '1.5'
                }}>
                    {message}
                </p>
                <div style={{
                    display: 'flex',
                    gap: '1rem'
                }}>
                    <button
                        onClick={handleCancel}
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '8px',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '0.95rem',
                            fontWeight: '600'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            background: isDanger
                                ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(220, 38, 38, 0.3))'
                                : 'linear-gradient(135deg, var(--primary), var(--secondary))',
                            border: isDanger
                                ? '1px solid rgba(239, 68, 68, 0.5)'
                                : '1px solid var(--primary)',
                            borderRadius: '8px',
                            color: isDanger ? '#ef4444' : 'white',
                            cursor: 'pointer',
                            fontSize: '0.95rem',
                            fontWeight: '600'
                        }}
                    >
                        {buttonText}
                    </button>
                </div>
            </div>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from {
                        transform: translateY(20px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
            `}</style>
        </div>
    );
};

export default ConfirmDialog;
