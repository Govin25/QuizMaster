import React from 'react';

const Logo = ({ size = 40 }) => {
    return (
        <img
            src="/logo.png"
            alt="Quainy Logo"
            width={size}
            height={size}
            style={{
                display: 'block',
                borderRadius: '8px'
            }}
        />
    );
};

export default Logo;
