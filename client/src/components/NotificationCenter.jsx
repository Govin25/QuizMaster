import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { safeParseDate } from '../utils/dateUtils';

const NotificationCenter = () => {
    const { notifications, unreadCount, markAsRead, markAllAsRead, clearAllNotifications } = useNotifications();
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

        setIsOpen(false); // Close dropdown

        // Navigation logic based on type
        // The type comes from DB. We need to check what strings we use.
        // challenge_invite -> Pending
        // challenge_accepted -> Active
        // challenge_declined -> Active (to see history? or just hub)
        // challenge_cancelled -> Hub

    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'challenge':
                return (
                    <div className="icon-wrapper challenge">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                    </div>
                );
            case 'achievement':
                return (
                    <div className="icon-wrapper achievement">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
                    </div>
                );
            case 'system':
            default:
                return (
                    <div className="icon-wrapper system">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                    </div>
                );
        }
    };

    const formatDate = (dateString) => {
        const date = safeParseDate(dateString);
        if (!date) return '-';

        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) {
            return 'Just now';
        }

        const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) {
            return rtf.format(-diffInMinutes, 'minute');
        }

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) {
            return rtf.format(-diffInHours, 'hour');
        }

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) {
            return rtf.format(-diffInDays, 'day');
        }

        return date.toLocaleDateString();
    };

    return (
        <div className="notification-center" ref={dropdownRef} style={{ position: 'relative' }}>
            <style>
                {`
                    @keyframes slideIn {
                        from { opacity: 0; transform: translateY(-10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }

                    .notification-bell {
                        position: relative;
                        cursor: pointer;
                        padding: 0.6rem;
                        border-radius: 50%;
                        transition: all 0.3s ease;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: rgba(255, 255, 255, 0.8);
                        background: rgba(255, 255, 255, 0.05);
                    }
                    .notification-bell:hover {
                        background: rgba(255, 255, 255, 0.15);
                        color: white;
                        transform: scale(1.05);
                        box-shadow: 0 0 15px rgba(139, 92, 246, 0.3);
                    }
                    .notification-badge {
                        position: absolute;
                        top: -2px;
                        right: -2px;
                        background: linear-gradient(135deg, #ef4444, #dc2626);
                        color: white;
                        font-size: 0.65rem;
                        min-width: 18px;
                        height: 18px;
                        padding: 0 4px;
                        border-radius: 9px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: 700;
                        border: 2px solid #0f172a;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                        animation: pulse 2s infinite;
                    }
                    
                    .notification-dropdown {
                        position: absolute;
                        top: calc(100% + 10px);
                        right: 0;
                        width: 360px;
                        background: rgba(15, 23, 42, 0.95);
                        backdrop-filter: blur(12px);
                        -webkit-backdrop-filter: blur(12px);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        border-radius: 1rem;
                        box-shadow: 
                            0 20px 25px -5px rgba(0, 0, 0, 0.5), 
                            0 8px 10px -6px rgba(0, 0, 0, 0.5),
                            0 0 0 1px rgba(255, 255, 255, 0.05);
                        z-index: 1000;
                        overflow: hidden;
                        display: flex;
                        flex-direction: column;
                        max-height: 500px;
                        transform-origin: top right;
                        animation: slideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
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
                        padding: 1rem 1.25rem;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        background: rgba(255, 255, 255, 0.03);
                    }
                    .notification-header h3 {
                        margin: 0;
                        font-size: 0.95rem;
                        font-weight: 600;
                        color: #f8fafc;
                        letter-spacing: 0.025em;
                    }
                    .header-actions {
                        display: flex;
                        gap: 0.5rem;
                        align-items: center;
                    }
                    .icon-btn {
                        background: transparent;
                        border: none;
                        color: #94a3b8;
                        cursor: pointer;
                        padding: 0.4rem;
                        border-radius: 0.375rem;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.2s;
                    }
                    .icon-btn:hover {
                        background: rgba(255, 255, 255, 0.1);
                        color: white;
                    }
                    .icon-btn.trash:hover {
                        background: rgba(239, 68, 68, 0.15);
                        color: #ef4444;
                    }
                    .icon-btn.close {
                        display: none;
                    }
                    @media (max-width: 640px) {
                        .icon-btn.close {
                            display: flex;
                        }
                    }
                    
                    .notification-list {
                        overflow-y: auto;
                        max-height: 400px;
                        padding: 0.5rem 0;
                    }
                    
                    /* Scrollbar styling */
                    .notification-list::-webkit-scrollbar {
                        width: 6px;
                    }
                    .notification-list::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .notification-list::-webkit-scrollbar-thumb {
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 3px;
                    }
                    .notification-list::-webkit-scrollbar-thumb:hover {
                        background: rgba(255, 255, 255, 0.2);
                    }

                    .notification-item {
                        padding: 0.85rem 1.25rem;
                        margin: 0 0.5rem 0.25rem;
                        border-radius: 0.5rem;
                        cursor: pointer;
                        transition: all 0.2s;
                        display: flex;
                        gap: 1rem;
                        align-items: flex-start;
                        border: 1px solid transparent;
                    }
                    .notification-item:hover {
                        background: rgba(255, 255, 255, 0.04);
                    }
                    .notification-item.unread {
                        background: rgba(139, 92, 246, 0.08); /* Violet tint */
                        border: 1px solid rgba(139, 92, 246, 0.15);
                    }
                    .notification-item.unread:hover {
                        background: rgba(139, 92, 246, 0.12);
                    }
                    
                    .icon-wrapper {
                        min-width: 36px;
                        height: 36px;
                        border-radius: 10px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-shrink: 0;
                    }
                    .icon-wrapper.challenge {
                        background: linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(234, 88, 12, 0.1));
                        color: #fb923c;
                    }
                    .icon-wrapper.achievement {
                        background: linear-gradient(135deg, rgba(234, 179, 8, 0.2), rgba(202, 138, 4, 0.1));
                        color: #facc15;
                    }
                    .icon-wrapper.system {
                        background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.1));
                        color: #60a5fa;
                    }

                    .notification-content {
                        flex: 1;
                        min-width: 0; /* Fix flex overflow */
                    }
                    
                    .notification-title {
                        font-weight: 600;
                        margin-bottom: 0.15rem;
                        color: #f1f5f9;
                        font-size: 0.9rem;
                        line-height: 1.3;
                    }
                    .notification-message {
                        color: #94a3b8;
                        font-size: 0.85rem;
                        margin-bottom: 0.35rem;
                        line-height: 1.4;
                    }
                    .notification-time {
                        color: #64748b;
                        font-size: 0.75rem;
                        display: flex;
                        align-items: center;
                        gap: 0.25rem;
                    }
                    
                    .unread-dot {
                        width: 8px;
                        height: 8px;
                        border-radius: 50%;
                        background: #8b5cf6;
                        margin-top: 0.5rem;
                        box-shadow: 0 0 8px rgba(139, 92, 246, 0.5);
                    }

                    .empty-state {
                        padding: 3rem 1.5rem;
                        text-align: center;
                        color: #64748b;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 1rem;
                    }
                    .empty-icon {
                        opacity: 0.3;
                    }
                `}
            </style>

            <div
                className="notification-bell"
                onClick={() => setIsOpen(!isOpen)}
                title="Notifications"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                        <div className="header-actions">
                            {notifications.length > 0 && (
                                <button
                                    className="icon-btn trash"
                                    onClick={clearAllNotifications}
                                    title="Clear all notifications"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                </button>
                            )}
                            <button
                                className="icon-btn close"
                                onClick={() => setIsOpen(false)}
                                title="Close"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div className="notification-list">
                        {notifications.length > 0 ? (
                            notifications.map(notification => (
                                <div
                                    key={notification.id}
                                    className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    {getNotificationIcon(notification.type || 'system')}

                                    <div className="notification-content">
                                        <div className="notification-title">{notification.title}</div>
                                        <div className="notification-message">{notification.message}</div>
                                        <div className="notification-time">
                                            {formatDate(notification.created_at)}
                                        </div>
                                    </div>

                                    {!notification.is_read && <div className="unread-dot"></div>}
                                </div>
                            ))
                        ) : (
                            <div className="empty-state">
                                <div className="empty-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                                        <line x1="2" y1="2" x2="22" y2="22"></line>
                                    </svg>
                                </div>
                                <span>No new notifications</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationCenter;
