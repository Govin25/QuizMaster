import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import API_URL, { GOOGLE_CLIENT_ID } from '../config';
import PrivacyPolicy from './PrivacyPolicy';
import TermsOfService from './TermsOfService';
import GoogleAuthButton from './GoogleAuthButton';
import { GoogleOAuthProvider } from '@react-oauth/google';

const AuthForm = ({ defaultMode = 'signup' }) => {
    const [isLogin, setIsLogin] = useState(defaultMode === 'login');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [identifier, setIdentifier] = useState(''); // For login: email or username
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
    const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
    const [showTermsOfService, setShowTermsOfService] = useState(false);
    const [showUsernameInfo, setShowUsernameInfo] = useState(false);
    const { login } = useAuth();
    const { showInfo, showError } = useToast();
    const [googleUsername, setGoogleUsername] = useState('');

    // Handle Google OAuth success
    const handleGoogleSuccess = (userData, isNewUser, token) => {
        // Small delay for cookie processing
        setTimeout(() => {
            if (isNewUser) {
                setGoogleUsername(userData.username);
                setShowUsernameInfo(true);
                setTimeout(() => {
                    login(userData, true, token);
                }, 2000);
            } else {
                login(userData, false, token);
            }
        }, 100);
    };

    // Handle Google OAuth error
    const handleGoogleError = (errorMessage) => {
        showError(errorMessage || 'Google sign-in failed');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setFieldErrors({});

        // Validate passwords match for signup
        if (!isLogin && password !== confirmPassword) {
            setFieldErrors({ confirmPassword: 'Passwords do not match' });
            return;
        }

        // Validate terms acceptance for signup
        if (!isLogin && (!acceptedTerms || !acceptedPrivacy)) {
            setError('You must accept the Terms of Service and Privacy Policy to create an account');
            return;
        }

        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';

        try {
            const requestBody = isLogin
                ? { identifier, password }
                : { name, email, password, acceptedTerms, acceptedPrivacy };

            const response = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
                credentials: 'include'  // Send and receive cookies
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle validation errors
                if (data.details && Array.isArray(data.details)) {
                    const newFieldErrors = {};
                    data.details.forEach(err => {
                        // If multiple errors for same field, join them
                        if (newFieldErrors[err.field]) {
                            newFieldErrors[err.field] += '. ' + err.message;
                        } else {
                            newFieldErrors[err.field] = err.message;
                        }
                    });
                    setFieldErrors(newFieldErrors);
                    // Don't set the generic error if we have specific field errors
                    return;
                }
                throw new Error(data.error || 'Authentication failed');
            }

            // Small delay to ensure the Set-Cookie header is fully processed by the browser
            // before we trigger state changes that cause API calls
            await new Promise(resolve => setTimeout(resolve, 100));

            // Show username info for new signups
            if (!isLogin) {
                setShowUsernameInfo(true);
                setTimeout(() => {
                    // Pass isNewUser flag for signups to redirect to quiz-hub
                    // Pass token for Header-Based Auth (iOS fix)
                    login(data.user, true, data.token);
                }, 2000);
            } else {
                login(data.user, false, data.token);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const resetForm = () => {
        setName('');
        setEmail('');
        setIdentifier('');
        setPassword('');
        setConfirmPassword('');
        setShowPassword(false);
        setShowConfirmPassword(false);
        setAcceptedTerms(false);
        setAcceptedPrivacy(false);
        setError('');
        setFieldErrors({});
        setShowUsernameInfo(false);
    };

    if (showUsernameInfo) {
        return (
            <div className="glass-card" style={{
                maxWidth: '400px',
                width: '100%',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                textAlign: 'center',
                padding: '2rem'
            }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
                <h2 style={{
                    marginBottom: '1rem',
                    background: 'linear-gradient(to right, #818cf8, #c084fc)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>Account Created!</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    Your username is:
                </p>
                <div style={{
                    background: 'rgba(99, 102, 241, 0.2)',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    fontFamily: 'monospace',
                    fontSize: '1.1rem',
                    color: '#818cf8'
                }}>
                    @{name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 12)}_****
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Use this for challenges and to let friends find you!
                </p>
                <div style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Redirecting...
                </div>
            </div>
        );
    }

    return (
        <div className="glass-card" style={{
            maxWidth: '400px',
            width: '100%',
            background: isLogin
                ? 'rgba(30, 41, 59, 0.7)'
                : 'rgba(15, 23, 42, 0.8)',
            border: isLogin
                ? '1px solid rgba(148, 163, 184, 0.1)'
                : '1px solid rgba(99, 102, 241, 0.2)',
            transition: 'all 0.3s ease'
        }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{
                    fontSize: '3rem',
                    marginBottom: '1rem',
                    filter: isLogin ? 'none' : 'drop-shadow(0 0 10px rgba(99, 102, 241, 0.5))'
                }}>
                    {isLogin ? '👋' : '🚀'}
                </div>
                <h2 style={{
                    marginBottom: '0.5rem',
                    background: isLogin
                        ? 'linear-gradient(to right, #fff, #cbd5e1)'
                        : 'linear-gradient(to right, #818cf8, #c084fc)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>
                    {isLogin ? 'Welcome Back!' : 'Join Quainy'}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    {isLogin
                        ? 'Enter your email or username to sign in'
                        : 'Start your journey to smarter learning'}
                </p>
            </div>

            {/* Google Sign-In Button */}
            {GOOGLE_CLIENT_ID ? (
                <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <GoogleAuthButton
                            onSuccess={handleGoogleSuccess}
                            onError={handleGoogleError}
                            buttonText={isLogin ? 'signin_with' : 'continue_with'}
                        />
                    </div>

                    {/* Visual Divider */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '1.5rem',
                        gap: '1rem'
                    }}>
                        <div style={{
                            flex: 1,
                            height: '1px',
                            background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.2))'
                        }} />
                        <span style={{
                            color: 'var(--text-muted)',
                            fontSize: '0.85rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>or</span>
                        <div style={{
                            flex: 1,
                            height: '1px',
                            background: 'linear-gradient(to left, transparent, rgba(255,255,255,0.2))'
                        }} />
                    </div>
                </GoogleOAuthProvider>
            ) : (
                <>
                    {/* Google Button Placeholder when CLIENT_ID not configured */}
                    <button
                        type="button"
                        onClick={() => showError('Google Sign-In is not configured. Please add VITE_GOOGLE_CLIENT_ID to your environment.')}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            marginBottom: '1.5rem',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '8px',
                            color: 'var(--text-primary)',
                            fontSize: '0.95rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.75rem',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24">
                            <path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115Z" />
                            <path fill="#34A853" d="M16.04 18.013c-1.09.703-2.474 1.078-4.04 1.078a7.077 7.077 0 0 1-6.723-4.823l-4.04 3.067A11.965 11.965 0 0 0 12 24c2.933 0 5.735-1.043 7.834-3l-3.793-2.987Z" />
                            <path fill="#4A90E2" d="M19.834 21c2.195-2.048 3.62-5.096 3.62-9 0-.71-.109-1.473-.272-2.182H12v4.637h6.436c-.317 1.559-1.17 2.766-2.395 3.558L19.834 21Z" />
                            <path fill="#FBBC05" d="M5.277 14.268A7.12 7.12 0 0 1 4.909 12c0-.782.125-1.533.357-2.235L1.24 6.65A11.934 11.934 0 0 0 0 12c0 1.92.445 3.73 1.237 5.335l4.04-3.067Z" />
                        </svg>
                        Continue with Google
                    </button>

                    {/* Visual Divider */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '1.5rem',
                        gap: '1rem'
                    }}>
                        <div style={{
                            flex: 1,
                            height: '1px',
                            background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.2))'
                        }} />
                        <span style={{
                            color: 'var(--text-muted)',
                            fontSize: '0.85rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>or</span>
                        <div style={{
                            flex: 1,
                            height: '1px',
                            background: 'linear-gradient(to left, transparent, rgba(255,255,255,0.2))'
                        }} />
                    </div>
                </>
            )}

            {error && (
                <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: '#fca5a5',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    marginBottom: '1.5rem',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <span>⚠️</span> {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                {/* Signup fields: Name and Email */}
                {!isLogin && (
                    <>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Full Name</label>
                            <input
                                type="text"
                                placeholder="Enter your name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    background: 'rgba(0, 0, 0, 0.2)',
                                    border: fieldErrors.name
                                        ? '1px solid rgba(239, 68, 68, 0.5)'
                                        : '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontSize: '1rem'
                                }}
                            />
                            {fieldErrors.name && (
                                <div style={{ color: '#fca5a5', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                                    {fieldErrors.name}
                                </div>
                            )}
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Email</label>
                            <input
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    background: 'rgba(0, 0, 0, 0.2)',
                                    border: fieldErrors.email
                                        ? '1px solid rgba(239, 68, 68, 0.5)'
                                        : '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontSize: '1rem'
                                }}
                            />
                            {fieldErrors.email && (
                                <div style={{ color: '#fca5a5', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                                    {fieldErrors.email}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Login field: Email or Username */}
                {isLogin && (
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Email or Username</label>
                        <input
                            type="text"
                            placeholder="Enter your email or username"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                background: 'rgba(0, 0, 0, 0.2)',
                                border: fieldErrors.identifier
                                    ? '1px solid rgba(239, 68, 68, 0.5)'
                                    : '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '8px',
                                color: 'white',
                                fontSize: '1rem'
                            }}
                        />
                        {fieldErrors.identifier && (
                            <div style={{ color: '#fca5a5', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                                {fieldErrors.identifier}
                            </div>
                        )}
                    </div>
                )}

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Password</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                paddingRight: '3rem',
                                background: 'rgba(0, 0, 0, 0.2)',
                                border: fieldErrors.password
                                    ? '1px solid rgba(239, 68, 68, 0.5)'
                                    : '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '8px',
                                color: 'white',
                                fontSize: '1rem'
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{
                                position: 'absolute',
                                right: '0.75rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: '0.25rem',
                                fontSize: '1.2rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'color 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.color = 'white'}
                            onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
                        >
                            {showPassword ? '👁️' : '👁️‍🗨️'}
                        </button>
                    </div>
                    {fieldErrors.password && (
                        <div style={{ color: '#fca5a5', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                            {fieldErrors.password}
                        </div>
                    )}
                    {/* Forgot password link - only show on login */}
                    {isLogin && (
                        <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
                            <button
                                type="button"
                                onClick={() => showInfo('Password reset is coming soon! For now, please contact support if you need help accessing your account.')}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#818cf8',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    padding: 0,
                                    textDecoration: 'underline',
                                    textUnderlineOffset: '3px'
                                }}
                            >
                                Forgot password?
                            </button>
                        </div>
                    )}
                </div>
                {!isLogin && (
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Confirm Password</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Re-enter your password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    paddingRight: '3rem',
                                    background: 'rgba(0, 0, 0, 0.2)',
                                    border: fieldErrors.confirmPassword
                                        ? '1px solid rgba(239, 68, 68, 0.5)'
                                        : '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontSize: '1rem'
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '0.75rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    padding: '0.25rem',
                                    fontSize: '1.2rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'color 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.color = 'white'}
                                onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
                            >
                                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                        {fieldErrors.confirmPassword && (
                            <div style={{ color: '#fca5a5', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                                {fieldErrors.confirmPassword}
                            </div>
                        )}
                    </div>
                )}

                {/* Terms and Privacy Acceptance for Signup */}
                {!isLogin && (
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{
                            background: 'rgba(99, 102, 241, 0.1)',
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                            borderRadius: '8px',
                            padding: '1rem',
                            textAlign: 'left'
                        }}>
                            <label style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                marginBottom: '0.75rem',
                                cursor: 'pointer',
                                fontSize: '0.85rem'
                            }}>
                                <input
                                    type="checkbox"
                                    checked={acceptedTerms}
                                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                                    style={{
                                        marginRight: '0.5rem',
                                        marginTop: '0.2rem',
                                        cursor: 'pointer',
                                        width: '16px',
                                        height: '16px'
                                    }}
                                />
                                <span style={{ color: 'var(--text-primary)' }}>
                                    I accept the{' '}
                                    <span
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setShowTermsOfService(true);
                                        }}
                                        style={{
                                            color: '#818cf8',
                                            textDecoration: 'underline',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Terms of Service
                                    </span>
                                </span>
                            </label>
                            <label style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                cursor: 'pointer',
                                fontSize: '0.85rem'
                            }}>
                                <input
                                    type="checkbox"
                                    checked={acceptedPrivacy}
                                    onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                                    style={{
                                        marginRight: '0.5rem',
                                        marginTop: '0.2rem',
                                        cursor: 'pointer',
                                        width: '16px',
                                        height: '16px'
                                    }}
                                />
                                <span style={{ color: 'var(--text-primary)' }}>
                                    I accept the{' '}
                                    <span
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setShowPrivacyPolicy(true);
                                        }}
                                        style={{
                                            color: '#818cf8',
                                            textDecoration: 'underline',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Privacy Policy
                                    </span>
                                </span>
                            </label>
                        </div>
                    </div>
                )}

                <button
                    type="submit"
                    style={{
                        width: '100%',
                        padding: '0.875rem',
                        background: isLogin
                            ? 'linear-gradient(135deg, #4f46e5, #4338ca)'
                            : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                        boxShadow: isLogin
                            ? '0 4px 12px rgba(79, 70, 229, 0.3)'
                            : '0 4px 12px rgba(124, 58, 237, 0.3)'
                    }}
                    onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                >
                    {isLogin ? 'Sign In' : 'Create Account'}
                </button>
            </form>

            <div style={{
                marginTop: '2rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.9rem'
            }}>
                {isLogin ? "Don't have an account yet? " : "Already have an account? "}
                <button
                    onClick={() => {
                        setIsLogin(!isLogin);
                        resetForm();
                    }}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: isLogin ? '#818cf8' : '#c084fc',
                        cursor: 'pointer',
                        fontWeight: '600',
                        padding: 0,
                        fontSize: 'inherit',
                        textDecoration: 'underline',
                        textUnderlineOffset: '4px'
                    }}
                >
                    {isLogin ? 'Sign Up' : 'Login'}
                </button>
            </div>

            {/* Legal Document Modals */}
            {showPrivacyPolicy && (
                <PrivacyPolicy onClose={() => setShowPrivacyPolicy(false)} />
            )}
            {showTermsOfService && (
                <TermsOfService onClose={() => setShowTermsOfService(false)} />
            )}
        </div>
    );
};

export default AuthForm;
