import React from 'react';
import { formatMonthYear } from '../../utils/dateUtils';

const ProfileHeader = ({ user, userStats, onBack }) => {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    color: 'white'
                }}>
                    {user.username.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h2 style={{ margin: 0, marginBottom: '0.5rem' }}>{user.username}</h2>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        <span>Level {userStats?.level || 1}</span>
                        <span>•</span>
                        <span>Joined {formatMonthYear(userStats?.joinedAt)}</span>
                    </div>
                </div>
            </div>
            <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.1)' }}>
                ← Back
            </button>
        </div>
    );
};

export default ProfileHeader;
