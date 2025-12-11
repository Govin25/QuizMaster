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
    // Increased to 15 seconds for iOS Safari/PWA cookie propagation
    const LOGIN_GRACE_PERIOD = 15000;

    // Check for existing user in localStorage on mount (optimistic)
    // Don't verify with server immediately to avoid race conditions on iOS
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const userData = JSON.parse(storedUser);
                setUser(userData);
                console.log('Restored user from localStorage:', userData.username);
            } catch (error) {
                console.error('Failed to parse stored user:', error);
                localStorage.removeItem('user');
            }
        }
        setLoading(false);
    }, []);

    const verifyAuth = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            const headers = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch(`${API_URL}/api/auth/verify`, {
                headers,
                credentials: 'include'  // Send cookies
            });

            if (response.ok) {
                const data = await response.json();
                setUser(data.user);
                // Store user data (not token) in localStorage for quick access
                localStorage.setItem('user', JSON.stringify(data.user));
                return true;
            } else {
                // Not authenticated
                setUser(null);
                localStorage.removeItem('user');
                // Only clear token if verify explicitly fails (401)
                if (response.status === 401) localStorage.removeItem('auth_token');
                return false;
            }
        } catch (error) {
            console.error('Auth verification failed:', error);
            // Don't clear user on network errors - might be temporary
            return false;
        }
    };

    const login = useCallback((userData, isNewUser = false, token = null) => {
        // Set timestamp ref BEFORE setting user to ensure it's available
        loginTimestampRef.current = Date.now();
        console.log('Login successful, timestamp set:', loginTimestampRef.current);

        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));

        // Store token if provided (Header-Based Auth for iOS)
        if (token) {
            localStorage.setItem('auth_token', token);
            console.log('Auth token stored in localStorage');
        }

        // For new signups, set initial view to quiz-hub
        if (isNewUser) {
            localStorage.setItem('app_view', JSON.stringify('hub'));
        }

        // On iOS, cookies may take a moment to propagate
        // Trust the login response during grace period
        console.log('User authenticated, grace period active for', LOGIN_GRACE_PERIOD, 'ms');
    }, [LOGIN_GRACE_PERIOD]);

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
        localStorage.removeItem('auth_token'); // Clear token
    }, []);

    const fetchWithAuth = useCallback(async (url, options = {}) => {
        const headers = {
            ...options.headers,
        };

        // Set default Content-Type to application/json only if not FormData and not explicitly set
        if (!(options.body instanceof FormData) && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }

        // Add Authorization header if token exists
        const token = localStorage.getItem('auth_token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers,
                credentials: 'include'  // Always send cookies (fallback)
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
                    // Pass token in verify request too
                    const verifyHeaders = {};
                    if (token) verifyHeaders['Authorization'] = `Bearer ${token}`;

                    const verifyResponse = await fetch(`${API_URL}/api/auth/verify`, {
                        headers: verifyHeaders,
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
        <AuthContext.Provider value={{ user, login, logout, fetchWithAuth, verifyAuth, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
