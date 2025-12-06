import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';

const NotificationCenter = () => {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNotificationClick = (notification) => {
        if (!notification.is_read) {
            markAsRead(notification.id);
        }
        // Handle navigation or actions based on updated logic if needed
        // For now, just marking as read is sufficient
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="notification-center" ref={dropdownRef} style={{ position: 'relative' }}>
            <style>
                {`
                    .notification-bell {
                        position: relative;
                        cursor: pointer;
                        padding: 0.5rem;
                        border-radius: 50%;
                        transition: background 0.3s;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                    }
                    .notification-bell:hover {
                        background: rgba(255, 255, 255, 0.1);
                    }
                    .notification-badge {
                        position: absolute;
                        top: 0;
                        right: 0;
                        background: #ef4444;
                        color: white;
                        font-size: 0.7rem;
                        width: 18px;
                        height: 18px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: bold;
                        border: 2px solid #0f172a;
                    }
                    .notification-dropdown {
                        position: absolute;
                        top: 100%;
                        right: 0;
                        width: 320px;
                        background: #1e293b;
                        border: 1px solid #334155;
                        border-radius: 0.75rem;
                        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
                        z-index: 1000;
                        overflow: hidden;
                        display: flex;
                        flex-direction: column;
                        max-height: 400px;
                        margin-top: 0.5rem;
                    }

                    @media (max-width: 640px) {
                        .notification-dropdown {
                            position: fixed;
                            top: 70px;
                            right: 1rem;
                            left: 1rem;
                            width: auto;
                            max-height: 80vh;
                        }
                    }
                    .notification-header {
                        padding: 1rem;
                        border-bottom: 1px solid #334155;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        background: #0f172a;
                    }
                    .notification-header h3 {
                        margin: 0;
                        font-size: 1rem;
                        color: white;
                    }
                    .mark-all-btn {
                        background: transparent;
                        border: none;
                        color: #3b82f6;
                        cursor: pointer;
                        font-size: 0.8rem;
                    }
                    .mark-all-btn:hover {
                        text-decoration: underline;
                    }
                    .notification-list {
                        overflow-y: auto;
                        max-height: 350px;
                    }
                    .notification-item {
                        padding: 1rem;
                        border-bottom: 1px solid #334155;
                        cursor: pointer;
                        transition: background 0.2s;
                    }
                    .notification-item:hover {
                        background: #334155;
                    }
                    .notification-item.unread {
                        background: rgba(59, 130, 246, 0.1);
                        border-left: 3px solid #3b82f6;
                    }
                    .notification-item:last-child {
                        border-bottom: none;
                    }
                    .notification-title {
                        font-weight: bold;
                        margin-bottom: 0.25rem;
                        color: white;
                        font-size: 0.9rem;
                    }
                    .notification-message {
                        color: #94a3b8;
                        font-size: 0.85rem;
                        margin-bottom: 0.25rem;
                    }
                    .notification-time {
                        color: #64748b;
                        font-size: 0.75rem;
                    }
                    .empty-state {
                        padding: 2rem;
                        text-align: center;
                        color: #94a3b8;
                    }
                `}
            </style>

            <div
                className="notification-bell"
                onClick={() => setIsOpen(!isOpen)}
                title="Notifications"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
            </div>

            {isOpen && (
                <div className="notification-dropdown">
                    <div className="notification-header">
                        <h3>Notifications</h3>
                        {unreadCount > 0 && (
                            <button className="mark-all-btn" onClick={markAllAsRead}>
                                Mark all as read
                            </button>
                        )}
                    </div>
                    <div className="notification-list">
                        {notifications.length > 0 ? (
                            notifications.map(notification => (
                                <div
                                    key={notification.id}
                                    className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div className="notification-title">{notification.title}</div>
                                    <div className="notification-message">{notification.message}</div>
                                    <div className="notification-time">{formatDate(notification.created_at)}</div>
                                </div>
                            ))
                        ) : (
                            <div className="empty-state">
                                No notifications yet
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationCenter;
