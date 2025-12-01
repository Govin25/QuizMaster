import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import API_URL from '../config';
import { FollowButton } from './SocialFeatures';

const TopCreators = ({ onViewProfile }) => {
    const { fetchWithAuth, user } = useAuth();
    const [creators, setCreators] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTopCreators();
    }, []);

    const fetchTopCreators = async () => {
        try {
            const response = await fetch(`${API_URL}/api/social/top-creators?limit=5`);
            if (response.ok) {
                const data = await response.json();
                setCreators(data);
            }
        } catch (err) {
            console.error('Failed to fetch top creators:', err);
        } finally {
            setLoading(false);
        }
    };

    const checkIfFollowing = async (userId) => {
        try {
            const response = await fetchWithAuth(`${API_URL}/api/social/is-following/${userId}`);
            if (response.ok) {
                const data = await response.json();
                return data.isFollowing;
            }
        } catch (err) {
            return false;
        }
        return false;
    };

    if (loading) {
        return (
            <div className="glass-card">
                <h2 style={{ marginBottom: '1.5rem' }}>🏆 Top Creators</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} className="skeleton" style={{ height: '80px', borderRadius: '12px' }} />
                    ))}
                </div>
            </div>
        );
    }

    if (creators.length === 0) {
        return null;
    }

    return (
        <div className="glass-card">
            <h2 style={{ marginBottom: '1.5rem' }}>🏆 Top Creators</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {creators.map((creator, index) => (
                    <CreatorCard
                        key={creator.id}
                        creator={creator}
                        rank={index + 1}
                        onViewProfile={onViewProfile}
                        checkIfFollowing={checkIfFollowing}
                        isCurrentUser={user?.id === creator.id}
                    />
                ))}
            </div>
        </div>
    );
};

const CreatorCard = ({ creator, rank, onViewProfile, checkIfFollowing, isCurrentUser }) => {
    const [isFollowing, setIsFollowing] = useState(false);
    const [localFollowersCount, setLocalFollowersCount] = useState(parseInt(creator.followersCount) || 0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isCurrentUser) {
            setLoading(true);
            checkIfFollowing(creator.id).then((following) => {
                setIsFollowing(following);
                setLoading(false);
            });
        } else {
            setLoading(false);
        }
    }, [creator.id, isCurrentUser]);

    const handleFollowChange = (newFollowState) => {
        setIsFollowing(newFollowState);
        // Update local follower count optimistically
        setLocalFollowersCount(prev => newFollowState ? prev + 1 : prev - 1);
    };

    const quizzesCount = parseInt(creator.quizzesCount) || 0;
    const totalLikes = parseInt(creator.totalLikes) || 0;

    const getRankBadge = () => {
        const badges = {
            1: { emoji: '🥇', color: '#fbbf24', label: '1st' },
            2: { emoji: '🥈', color: '#94a3b8', label: '2nd' },
            3: { emoji: '🥉', color: '#cd7f32', label: '3rd' }
        };
        return badges[rank] || { emoji: `${rank}`, color: '#6366f1', label: `${rank}th` };
    };

    const badge = getRankBadge();

    return (
        <div
            className="hover-lift"
            style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                padding: '1rem',
                border: '1px solid var(--glass-border)',
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '1rem',
                cursor: 'pointer',
                transition: 'all 0.3s'
            }}
            onClick={() => onViewProfile && onViewProfile(creator.id)}
        >
            {/* Rank Badge */}
            <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${badge.color}, ${badge.color}dd)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: '700',
                flexShrink: 0,
                boxShadow: `0 4px 12px ${badge.color}40`
            }}>
                {badge.emoji}
            </div>

            {/* Creator Info */}
            <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <div style={{
                    fontSize: '1rem',
                    fontWeight: '700',
                    color: 'white',
                    marginBottom: '0.25rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                }}>
                    {creator.username}
                </div>
                <div style={{
                    display: 'flex',
                    gap: '1rem',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    flexWrap: 'wrap'
                }}>
                    <span title="Quizzes created by this user">📝 {quizzesCount} created</span>
                    <span title="People following this user">👥 {localFollowersCount} followers</span>
                    <span title="Total likes received on all quizzes">❤️ {totalLikes} likes</span>
                </div>
            </div>

            {/* Follow Button */}
            {!isCurrentUser && (
                <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        flexShrink: 0,
                        width: '100%',
                        maxWidth: '140px'
                    }}
                >
                    <FollowButton
                        userId={creator.id}
                        initialFollowing={isFollowing}
                        onFollowChange={handleFollowChange}
                    />
                </div>
            )}
        </div>
    );
};

export default TopCreators;
