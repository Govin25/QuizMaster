import React from 'react';

const Logo = ({ size = 40, className = '' }) => {
    const gradientId = `logoGradient-${Math.random().toString(36).substr(2, 9)}`;

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`quainy-logo ${className}`}
            style={{ transition: 'all 0.3s ease' }}
        >
            <defs>
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="50%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
            </defs>

            {/* Outer Circle - Q shape */}
            <circle
                cx="50"
                cy="50"
                r="38"
                stroke={`url(#${gradientId})`}
                strokeWidth="8"
                fill="none"
            />

            {/* Q tail */}
            <path
                d="M 68 68 L 82 82"
                stroke={`url(#${gradientId})`}
                strokeWidth="8"
                strokeLinecap="round"
            />

            {/* Inner accent circle */}
            <circle
                cx="50"
                cy="50"
                r="15"
                fill={`url(#${gradientId})`}
                opacity="0.3"
            />
        </svg>
    );
};

export default Logo;
