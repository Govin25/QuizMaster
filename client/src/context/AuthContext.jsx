import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { useToast } from './ToastContext';
import API_URL from '../config';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    // Use ref instead of state to avoid closure issues in useCallback
    const loginTimestampRef = useRef(null);
    const { showError } = useToast();

    // Grace period in ms - don't logout during this time after login
    const LOGIN_GRACE_PERIOD = 10000; // Increased to 10 seconds

    // Verify authentication on mount by checking with server
    useEffect(() => {
        verifyAuth();
    }, []);

    const verifyAuth = async () => {
        try {
            const response = await fetch(`${API_URL}/api/auth/verify`, {
                credentials: 'include'  // Send cookies
            });

            if (response.ok) {
                const data = await response.json();
                setUser(data.user);
                // Store user data (not token) in localStorage for quick access
                localStorage.setItem('user', JSON.stringify(data.user));
            } else {
                // Not authenticated
                setUser(null);
                localStorage.removeItem('user');
            }
        } catch (error) {
            console.error('Auth verification failed:', error);
            setUser(null);
            localStorage.removeItem('user');
        } finally {
            setLoading(false);
        }
    };

    const login = useCallback((userData, isNewUser = false) => {
        // Set timestamp ref BEFORE setting user to ensure it's available
        loginTimestampRef.current = Date.now();
        console.log('Login timestamp set:', loginTimestampRef.current);

        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));

        // For new signups, set initial view to quiz-hub
        if (isNewUser) {
            localStorage.setItem('app_view', JSON.stringify('hub'));
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            // Call server logout endpoint to clear cookie
            await fetch(`${API_URL}/api/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });
        } catch (error) {
            console.error('Logout request failed:', error);
        }

        loginTimestampRef.current = null; // Clear timestamp on logout
        setUser(null);
        localStorage.removeItem('user');
    }, []);

    const fetchWithAuth = useCallback(async (url, options = {}) => {
        const headers = {
            ...options.headers,
        };

        // Set default Content-Type to application/json only if not FormData and not explicitly set
        if (!(options.body instanceof FormData) && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers,
                credentials: 'include'  // Always send cookies
            });

            // Only treat 401/403 as session expired if we think we're logged in
            if ((response.status === 401 || response.status === 403) && user) {
                // Check if we're in the grace period after login (use ref for current value)
                const timestamp = loginTimestampRef.current;
                const timeSinceLogin = timestamp ? Date.now() - timestamp : Infinity;
                const isInGracePeriod = timeSinceLogin < LOGIN_GRACE_PERIOD;

                console.log('Auth error check:', {
                    status: response.status,
                    timestamp,
                    timeSinceLogin,
                    isInGracePeriod
                });

                if (isInGracePeriod) {
                    // During grace period, don't logout - cookie might still be setting up
                    console.log('Auth error during grace period, not logging out');
                    return response;
                }

                // Verify if session is truly expired by checking with server
                try {
                    const verifyResponse = await fetch(`${API_URL}/api/auth/verify`, {
                        credentials: 'include'
                    });

                    if (!verifyResponse.ok) {
                        // Session is truly expired
                        showError('Session expired. Please login again.');
                        logout();
                    }
                    // If verify succeeds, the original 401/403 was likely due to
                    // permissions (not auth), so don't logout - just return the response
                } catch (verifyError) {
                    // Network error on verify - don't logout, might be temporary
                    console.warn('Auth verification failed:', verifyError);
                }
            }

            return response;
        } catch (error) {
            throw error;
        }
    }, [logout, showError, user]);

    return (
        <AuthContext.Provider value={{ user, login, logout, fetchWithAuth, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
