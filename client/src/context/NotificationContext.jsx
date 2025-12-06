import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import API_URL from '../config';
import { io } from 'socket.io-client';

const NotificationContext = createContext(null);

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
    const { user, fetchWithAuth, loading: authLoading } = useAuth();
    const { showInfo } = useToast();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        // Don't fetch notifications or connect socket if auth is still loading
        if (authLoading) {
            return;
        }

        if (user) {
            fetchNotifications();

            // Connect to socket for real-time notifications with error handling
            const newSocket = io(API_URL, {
                reconnection: true,
                reconnectionAttempts: 5, // Limit reconnection attempts
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                timeout: 10000,
                transports: ['websocket', 'polling'] // Prefer websocket
            });

            setSocket(newSocket);

            // Handle connection errors
            newSocket.on('connect_error', (error) => {
                console.warn('Socket connection error:', error.message);
                // Don't spam the console or retry indefinitely
            });

            newSocket.on('connect_timeout', () => {
                console.warn('Socket connection timeout');
            });

            newSocket.on('reconnect_failed', () => {
                console.error('Socket reconnection failed after max attempts');
                // Stop trying to reconnect
                newSocket.close();
            });

            // Join user-specific room on successful connection
            newSocket.on('connect', () => {
                console.log('Socket connected successfully');
                newSocket.emit('join_user_room', { userId: user.id });
            });

            newSocket.on('notification_received', (notification) => {
                setNotifications(prev => [notification, ...prev]);
                setUnreadCount(prev => prev + 1);
                showInfo(`🔔 ${notification.title}: ${notification.message}`);

                // Play sound
                try {
                    const audio = new Audio('/notification.mp3');
                    audio.play().catch(() => { });
                } catch (e) { }
            });

            return () => {
                newSocket.close();
            };
        } else {
            setNotifications([]);
            setUnreadCount(0);
        }
    }, [user, authLoading]);

    const fetchNotifications = async () => {
        try {
            console.log('🔄 Fetching notifications for user:', user?.id);
            const response = await fetchWithAuth(`${API_URL}/api/notifications?limit=20`);
            console.log('📥 Notification fetch status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('📦 Notifications received:', data.notifications.length);
                setNotifications(data.notifications);
                setUnreadCount(data.unreadCount);
            } else {
                console.error('❌ Failed to fetch notifications:', await response.text());
            }
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        }
    };

    const markAsRead = async (notificationId) => {
        try {
            // Optimistic update
            setNotifications(prev => prev.map(n =>
                n.id === notificationId ? { ...n, is_read: true } : n
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));

            await fetchWithAuth(`${API_URL}/api/notifications/${notificationId}/read`, {
                method: 'PUT'
            });
        } catch (error) {
            console.error('Failed to mark notification as read', error);
            fetchNotifications(); // Revert on error
        }
    };

    const markAllAsRead = async () => {
        try {
            // Optimistic update
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);

            await fetchWithAuth(`${API_URL}/api/notifications/read-all`, {
                method: 'PUT'
            });
        } catch (error) {
            console.error('Failed to mark all as read', error);
            fetchNotifications();
        }
    };

    const clearAllNotifications = async () => {
        try {
            // Optimistic update
            setNotifications([]);
            setUnreadCount(0);

            await fetchWithAuth(`${API_URL}/api/notifications`, {
                method: 'DELETE'
            });
        } catch (error) {
            console.error('Failed to delete all notifications', error);
            fetchNotifications();
        }
    };

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            markAsRead,
            markAllAsRead,
            clearAllNotifications,
            fetchNotifications
        }}>
            {children}
        </NotificationContext.Provider>
    );
};
