import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useToast } from './ToastContext';
import API_URL from '../config';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const { showError } = useToast();

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
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));

        // For new signups, set initial view to quiz-hub
        if (isNewUser) {
            localStorage.setItem('app_view', JSON.stringify('quiz-hub'));
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

            if (response.status === 401 || response.status === 403) {
                showError('Session expired. Please login again.');
                logout();
                return response;
            }

            return response;
        } catch (error) {
            throw error;
        }
    }, [logout, showError]);

    return (
        <AuthContext.Provider value={{ user, login, logout, fetchWithAuth, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

