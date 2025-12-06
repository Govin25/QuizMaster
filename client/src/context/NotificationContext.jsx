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

            // Connect to socket for real-time notifications
            const newSocket = io(API_URL);
            setSocket(newSocket);

            // Join user-specific room if needed (or backend handles it via session)
            // Assuming backend joins socket to room based on auth or handshake
            // Currently backend emits to `user_${userId}` room. 
            // We need to ensure backend puts this socket in that room.
            // Looking at backend `server/src/index.js`, we don't see explicit "join room user_id" logic on connection 
            // other than what happens in `join_game` or `join_challenge`.
            // We should add a generic "join_user_room" event or rely on `socket.on('connection')` identifying user.
            // Let's modify this to emit an event to join the user room.

            newSocket.emit('join_user_room', { userId: user.id });

            newSocket.on('notification_received', (notification) => {
                setNotifications(prev => [notification, ...prev]);
                setUnreadCount(prev => prev + 1);
                showInfo(`🔔 ${notification.title}: ${notification.message}`);

                // Play sound
                try {
                    const audio = new Audio('/notification.mp3'); // We'll need to add this or ignore if missing
                    audio.play().catch(() => { });
                } catch (e) { }
            });

            return () => newSocket.close();
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
