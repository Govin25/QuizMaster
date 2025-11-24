import React, { useEffect } from 'react';

const Toast = ({ id, message, type = 'info', onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose(id);
        }, 3000);
        return () => clearTimeout(timer);
    }, [id, onClose]);

    const getStyles = () => {
        const baseStyles = {
            background: 'rgba(10, 10, 20, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid',
            borderRadius: '12px',
            padding: '1rem 1.5rem',
            marginBottom: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            minWidth: '300px',
            maxWidth: '400px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            animation: 'slideIn 0.3s ease-out'
        };

        switch (type) {
            case 'success':
                return {
                    ...baseStyles,
                    borderColor: 'rgba(34, 197, 94, 0.5)',
                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1))'
                };
            case 'error':
                return {
                    ...baseStyles,
                    borderColor: 'rgba(239, 68, 68, 0.5)',
                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.1))'
                };
            case 'info':
            default:
                return {
                    ...baseStyles,
                    borderColor: 'rgba(99, 102, 241, 0.5)',
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))'
                };
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'success':
                return '✓';
            case 'error':
                return '✕';
            case 'info':
            default:
                return 'ℹ';
        }
    };

    const getIconColor = () => {
        switch (type) {
            case 'success':
                return '#22c55e';
            case 'error':
                return '#ef4444';
            case 'info':
            default:
                return '#6366f1';
        }
    };

    return (
        <div style={getStyles()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    color: getIconColor(),
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `${getIconColor()}20`,
                    borderRadius: '50%'
                }}>
                    {getIcon()}
                </span>
                <span style={{ color: 'white', fontSize: '0.95rem' }}>{message}</span>
            </div>
            <button
                onClick={() => onClose(id)}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.6)',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    padding: '0',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.color = 'white'}
                onMouseLeave={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.6)'}
            >
                ×
            </button>
        </div>
    );
};

export default Toast;
