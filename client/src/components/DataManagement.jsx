import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import API_URL from '../config';
import ConfirmDialog from './ConfirmDialog';

const DataManagement = () => {
    const { user, logout } = useAuth();
    const { showSuccess, showError } = useToast();
    const [deletionStatus, setDeletionStatus] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showImmediateDeleteConfirm, setShowImmediateDeleteConfirm] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchDeletionStatus();
    }, []);

    const fetchDeletionStatus = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/legal/user/deletion-status`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            setDeletionStatus(data);
        } catch (error) {
            console.error('Error fetching deletion status:', error);
        }
    };

    const handleExportData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/legal/user/data-export`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to export data');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `quizmaster-data-${user.id}-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            showSuccess('Data exported successfully');
        } catch (error) {
            console.error('Error exporting data:', error);
            showError('Failed to export data');
        } finally {
            setLoading(false);
        }
    };

    const handleRequestDeletion = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/legal/user/request-deletion`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to request deletion');
            }

            const data = await response.json();
            showSuccess(`Account deletion requested. Your account will be deleted on ${new Date(data.deletionDate).toLocaleDateString()}`);
            fetchDeletionStatus();
        } catch (error) {
            console.error('Error requesting deletion:', error);
            showError('Failed to request account deletion');
        } finally {
            setLoading(false);
            setShowDeleteConfirm(false);
        }
    };

    const handleCancelDeletion = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/legal/user/cancel-deletion`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to cancel deletion');
            }

            showSuccess('Account deletion cancelled');
            fetchDeletionStatus();
        } catch (error) {
            console.error('Error cancelling deletion:', error);
            showError('Failed to cancel deletion');
        } finally {
            setLoading(false);
        }
    };

    const handlePermanentDelete = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/legal/user/account`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ confirmDeletion: true, immediate: true })
            });

            if (!response.ok) {
                throw new Error('Failed to delete account');
            }

            showSuccess('Account deleted successfully');
            setTimeout(() => {
                logout();
            }, 2000);
        } catch (error) {
            console.error('Error deleting account:', error);
            showError('Failed to delete account');
        } finally {
            setLoading(false);
            setShowImmediateDeleteConfirm(false);
        }
    };

    const sectionStyle = {
        background: 'rgba(30, 41, 59, 0.4)',
        border: '1px solid rgba(148, 163, 184, 0.1)',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '1.5rem'
    };

    const buttonStyle = {
        padding: '0.75rem 1.5rem',
        borderRadius: '8px',
        border: 'none',
        fontSize: '0.95rem',
        fontWeight: '600',
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
        opacity: loading ? 0.6 : 1
    };

    const primaryButtonStyle = {
        ...buttonStyle,
        background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
        color: 'white',
        boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
    };

    const dangerButtonStyle = {
        ...buttonStyle,
        background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
        color: 'white',
        boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
    };

    const warningBoxStyle = {
        background: 'rgba(245, 158, 11, 0.1)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        borderRadius: '8px',
        padding: '1rem',
        marginTop: '1rem',
        color: '#fbbf24'
    };

    return (
        <div>
            <h3 style={{
                fontSize: '1.5rem',
                marginBottom: '1.5rem',
                background: 'linear-gradient(to right, #818cf8, #c084fc)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
            }}>
                Data & Privacy Management
            </h3>

            {/* Data Export Section */}
            <div style={sectionStyle}>
                <h4 style={{ fontSize: '1.2rem', marginBottom: '0.75rem', color: '#a5b4fc' }}>
                    📥 Export Your Data
                </h4>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                    Download all your personal data in JSON format. This includes your profile, quiz results, created quizzes, and achievements.
                </p>
                <button
                    style={primaryButtonStyle}
                    onClick={handleExportData}
                    disabled={loading}
                    onMouseEnter={(e) => !loading && (e.target.style.transform = 'translateY(-2px)')}
                    onMouseLeave={(e) => !loading && (e.target.style.transform = 'translateY(0)')}
                >
                    {loading ? 'Exporting...' : 'Export My Data'}
                </button>
            </div>

            {/* Account Deletion Section */}
            <div style={sectionStyle}>
                <h4 style={{ fontSize: '1.2rem', marginBottom: '0.75rem', color: '#fca5a5' }}>
                    🗑️ Account Deletion Options
                </h4>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                    Choose how you want to delete your account. You can schedule deletion with a grace period or delete immediately.
                </p>

                {deletionStatus?.hasPendingDeletion ? (
                    <div>
                        <div style={warningBoxStyle}>
                            <p style={{ margin: 0, fontWeight: '600' }}>
                                ⚠️ Account Deletion Scheduled
                            </p>
                            <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem' }}>
                                Your account will be permanently deleted on{' '}
                                <strong>{new Date(deletionStatus.deletionDate).toLocaleDateString()}</strong>
                                {' '}({deletionStatus.daysRemaining} days remaining)
                            </p>
                        </div>
                        <button
                            style={{ ...primaryButtonStyle, marginTop: '1rem' }}
                            onClick={handleCancelDeletion}
                            disabled={loading}
                            onMouseEnter={(e) => !loading && (e.target.style.transform = 'translateY(-2px)')}
                            onMouseLeave={(e) => !loading && (e.target.style.transform = 'translateY(0)')}
                        >
                            {loading ? 'Cancelling...' : 'Cancel Deletion Request'}
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Option 1: Scheduled Deletion */}
                        <div style={{
                            background: 'rgba(245, 158, 11, 0.1)',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            borderRadius: '8px',
                            padding: '1rem'
                        }}>
                            <h5 style={{ color: '#fbbf24', marginBottom: '0.5rem', fontSize: '1rem' }}>
                                📅 Schedule Account Deletion (Recommended)
                            </h5>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.75rem', lineHeight: '1.5' }}>
                                Request account deletion with a <strong>30-day grace period</strong>. You can cancel anytime during this period.
                                Public quizzes will be preserved (anonymized) for the community.
                            </p>
                            <button
                                style={{
                                    ...buttonStyle,
                                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                    color: 'white',
                                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                                }}
                                onClick={() => setShowDeleteConfirm(true)}
                                disabled={loading}
                                onMouseEnter={(e) => !loading && (e.target.style.transform = 'translateY(-2px)')}
                                onMouseLeave={(e) => !loading && (e.target.style.transform = 'translateY(0)')}
                            >
                                Schedule Deletion (30-Day Grace Period)
                            </button>
                        </div>

                        {/* Option 2: Immediate Deletion */}
                        <div style={{
                            background: 'rgba(220, 38, 38, 0.1)',
                            border: '1px solid rgba(220, 38, 38, 0.3)',
                            borderRadius: '8px',
                            padding: '1rem'
                        }}>
                            <h5 style={{ color: '#ef4444', marginBottom: '0.5rem', fontSize: '1rem' }}>
                                ⚡ Delete Account Immediately (Permanent)
                            </h5>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.75rem', lineHeight: '1.5' }}>
                                <strong>Permanently delete your account right now</strong> with no grace period.
                                This action cannot be undone. All your data, quizzes, results, and stats will be wiped out immediately.
                            </p>
                            <button
                                style={dangerButtonStyle}
                                onClick={() => setShowImmediateDeleteConfirm(true)}
                                disabled={loading}
                                onMouseEnter={(e) => !loading && (e.target.style.transform = 'translateY(-2px)')}
                                onMouseLeave={(e) => !loading && (e.target.style.transform = 'translateY(0)')}
                            >
                                Delete Everything Now (No Grace Period)
                            </button>
                        </div>
                    </div>
                )}

                <div style={{
                    marginTop: '1rem',
                    padding: '0.75rem',
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    color: 'var(--text-muted)'
                }}>
                    <strong>Note:</strong> Public quizzes you created will be preserved (anonymized) for the community. Private quizzes will be deleted.
                </div>
            </div>

            {/* Confirm Dialog for Scheduled Deletion */}
            {showDeleteConfirm && (
                <ConfirmDialog
                    title="Schedule Account Deletion?"
                    message="Your account will be scheduled for deletion with a 30-day grace period. You can cancel anytime during this period. Are you sure you want to proceed?"
                    onConfirm={handleRequestDeletion}
                    onCancel={() => setShowDeleteConfirm(false)}
                    confirmText="Schedule Deletion"
                    isDangerous={true}
                />
            )}

            {/* Confirm Dialog for Immediate Deletion */}
            {showImmediateDeleteConfirm && (
                <ConfirmDialog
                    title="Delete Account Immediately?"
                    message="⚠️ WARNING: This will PERMANENTLY delete your account RIGHT NOW with NO grace period. All your data, quizzes, results, and stats will be wiped out immediately. This action CANNOT be undone. Are you absolutely sure?"
                    onConfirm={handlePermanentDelete}
                    onCancel={() => setShowImmediateDeleteConfirm(false)}
                    confirmText="Yes, Delete Everything Now"
                    isDangerous={true}
                />
            )}
        </div>
    );
};

export default DataManagement;
