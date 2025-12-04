import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const { showError } = useToast();

    useEffect(() => {
        if (token) {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                setUser(JSON.parse(storedUser));
            }
        }
    }, [token]);

    const login = useCallback((userData, authToken, isNewUser = false) => {
        setUser(userData);
        setToken(authToken);
        localStorage.setItem('token', authToken);
        localStorage.setItem('user', JSON.stringify(userData));

        // For new signups, set initial view to quiz-hub
        if (isNewUser) {
            localStorage.setItem('app_view', JSON.stringify('quiz-hub'));
        }
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
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

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, { ...options, headers });

            if (response.status === 401 || response.status === 403) {
                showError('Session expired. Please login again.');
                logout();
                return response;
            }

            return response;
        } catch (error) {
            throw error;
        }
    }, [token, logout, showError]);

    return (
        <AuthContext.Provider value={{ user, token, login, logout, fetchWithAuth }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
