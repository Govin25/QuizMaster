import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import API_URL from '../config';

/**
 * Google OAuth Button Component
 * Handles Google Sign-In flow and backend authentication
 */
const GoogleAuthButton = ({ onSuccess, onError, buttonText = 'continue_with' }) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleGoogleSuccess = async (credentialResponse) => {
        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/auth/google`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    credential: credentialResponse.credential,
                }),
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Google authentication failed');
            }

            // Call the success callback with user data
            onSuccess(data.user, data.isNewUser, data.token);
        } catch (error) {
            console.error('Google auth error:', error);
            onError?.(error.message || 'Failed to authenticate with Google');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleError = () => {
        console.error('Google Sign-In failed');
        onError?.('Google Sign-In was cancelled or failed');
    };

    if (isLoading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.75rem',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                gap: '0.5rem',
                color: 'var(--text-muted)',
            }}>
                <span className="loading-spinner" style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTopColor: '#818cf8',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                }}></span>
                Signing in...
            </div>
        );
    }

    return (
        <div style={{ width: '100%' }}>
            <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                text={buttonText}
                shape="rectangular"
                size="large"
                width="100%"
                theme="filled_black"
                logo_alignment="left"
            />
            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default GoogleAuthButton;
