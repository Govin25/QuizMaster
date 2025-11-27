import React from 'react';

const Logo = ({ size = 40, style }) => {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={style}
        >
            <defs>
                {/* Wisdom Gradient (Indigo to Purple) */}
                <linearGradient id="circleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>

                {/* Success Gradient (Emerald to Teal) */}
                <linearGradient id="checkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#10b981" />
                </linearGradient>

                {/* Soft Shadow for Depth */}
                <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>

            {/* The Circle (The Question / Topic) */}
            {/* Open circle with a gap for the tail */}
            <path
                d="M 85 50 A 35 35 0 1 1 50 15"
                stroke="url(#circleGradient)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                transform="rotate(-45 50 50)"
            />

            {/* The Checkmark (The Answer / Mastery) */}
            {/* Forms the tail of the Q */}
            <path
                d="M 40 52 L 52 64 L 82 34"
                stroke="url(#checkGradient)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                filter="url(#dropShadow)"
            />

            {/* Central Dot (Focus) */}
            {/* <circle cx="50" cy="50" r="6" fill="url(#circleGradient)" opacity="0.5" /> */}

        </svg>
    );
};

export default Logo;
