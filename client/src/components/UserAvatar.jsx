import React from 'react';

const UserAvatar = ({ username, size = 40 }) => {
    // Get initials from username
    const getInitials = (name) => {
        if (!name) return '?';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    const initials = getInitials(username);

    return (
        <div
            className="user-avatar"
            style={{
                width: `${size}px`,
                height: `${size}px`,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                fontSize: `${size * 0.4}px`,
                color: 'white',
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)',
                transition: 'all 0.3s ease'
            }}
        >
            {initials}
        </div>
    );
};

export default UserAvatar;
