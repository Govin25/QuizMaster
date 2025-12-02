import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import API_URL from '../config';
import DataManagement from './DataManagement';
import ProfileHeader from './profile/ProfileHeader';
import QuickStats from './profile/QuickStats';
import PerformanceOverview from './profile/PerformanceOverview';
import PerformanceTrend from './profile/PerformanceTrend';
import CategoryMastery from './profile/CategoryMastery';
import AchievementsSection from './profile/AchievementsSection';
import RecommendationsSection from './profile/RecommendationsSection';
import RecentActivitySection from './profile/RecentActivitySection';
import { SocialStats } from './SocialFeatures';

const UserProfile = ({ onBack }) => {
    const { user, logout, fetchWithAuth } = useAuth();
    const { showError } = useToast();

    const [statsState, setStatsState] = useState({ data: null, loading: true, error: null });
    const [activityState, setActivityState] = useState({ data: null, loading: true, error: null });
    const [trendsState, setTrendsState] = useState({ data: [], loading: true, error: null });
    const [achievementsState, setAchievementsState] = useState({ data: null, loading: true, error: null });
    const [recommendationsState, setRecommendationsState] = useState({ data: [], loading: true, error: null });
    const [socialProfile, setSocialProfile] = useState(null);

    const [activeTab, setActiveTab] = useState('overview'); // overview, data-privacy

    useEffect(() => {
        if (user) {
            fetchAllData();
        }
    }, [user]);

    const fetchAllData = () => {
        fetchStats();
        fetchActivity();
        fetchTrends();
        fetchAchievements();
        fetchRecommendations();
        fetchSocialProfile();
    };

    const handleFetchError = (res) => {
        if (res.status === 401 || res.status === 403) {
            showError('Session expired. Please login again.');
            logout();
            return true;
        }
        return false;
    };

    const fetchStats = async () => {
        try {
            setStatsState(prev => ({ ...prev, loading: true, error: null }));
            const res = await fetchWithAuth(`${API_URL}/api/profile/stats/${user.id}`);
            if (handleFetchError(res)) return;
            if (!res.ok) throw new Error('Failed to fetch stats');
            const data = await res.json();
            setStatsState({ data, loading: false, error: null });
        } catch (err) {
            console.error(err);
            setStatsState(prev => ({ ...prev, loading: false, error: err.message }));
        }
    };

    const fetchActivity = async () => {
        try {
            setActivityState(prev => ({ ...prev, loading: true, error: null }));
            const res = await fetchWithAuth(`${API_URL}/api/profile/activity/${user.id}`);
            if (handleFetchError(res)) return;
            if (!res.ok) throw new Error('Failed to fetch activity');
            const data = await res.json();
            setActivityState({ data, loading: false, error: null });
        } catch (err) {
            console.error(err);
            setActivityState(prev => ({ ...prev, loading: false, error: err.message }));
        }
    };

    const fetchTrends = async () => {
        try {
            setTrendsState(prev => ({ ...prev, loading: true, error: null }));
            const res = await fetchWithAuth(`${API_URL}/api/profile/trends/${user.id}?days=30`);
            if (handleFetchError(res)) return;
            if (!res.ok) throw new Error('Failed to fetch trends');
            const data = await res.json();
            setTrendsState({ data: data.trends || [], loading: false, error: null });
        } catch (err) {
            console.error(err);
            setTrendsState(prev => ({ ...prev, loading: false, error: err.message }));
        }
    };

    const fetchAchievements = async () => {
        try {
            setAchievementsState(prev => ({ ...prev, loading: true, error: null }));
            const res = await fetchWithAuth(`${API_URL}/api/profile/achievements/${user.id}`);
            if (handleFetchError(res)) return;
            if (!res.ok) throw new Error('Failed to fetch achievements');
            const data = await res.json();
            setAchievementsState({ data, loading: false, error: null });
        } catch (err) {
            console.error(err);
            setAchievementsState(prev => ({ ...prev, loading: false, error: err.message }));
        }
    };

    const fetchRecommendations = async () => {
        try {
            setRecommendationsState(prev => ({ ...prev, loading: true, error: null }));
            const res = await fetchWithAuth(`${API_URL}/api/profile/recommendations/${user.id}`);
            if (handleFetchError(res)) return;
            if (!res.ok) throw new Error('Failed to fetch recommendations');
            const data = await res.json();
            setRecommendationsState({ data: data.recommendations || [], loading: false, error: null });
        } catch (err) {
            console.error(err);
            setRecommendationsState(prev => ({ ...prev, loading: false, error: err.message }));
        }
    };

    const fetchSocialProfile = async () => {
        try {
            const res = await fetch(`${API_URL}/api/social/profile/${user.id}`);
            if (res.ok) {
                const data = await res.json();
                setSocialProfile(data);
            }
        } catch (err) {
            console.error('Failed to fetch social profile:', err);
        }
    };

    return (
        <div style={{ maxWidth: '1200px', width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem', position: 'relative' }}>


            {/* Header & Quick Stats */}
            <div className="glass-card">
                <ProfileHeader
                    user={user}
                    userStats={statsState.data?.userStats}
                    onBack={onBack}
                />

                {/* Social Stats */}
                {socialProfile && (
                    <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)' }}>
                        <h3 style={{ margin: '0 0 1rem 0' }}>Social</h3>
                        <SocialStats
                            followers={socialProfile.socialStats?.followers || 0}
                            following={socialProfile.socialStats?.following || 0}
                            quizzesCreated={socialProfile.socialStats?.quizzesCreated || 0}
                            totalLikes={socialProfile.socialStats?.totalLikes || 0}
                        />
                    </div>
                )}

                {/* Quick Stats */}
                <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)' }}>
                    <h3 style={{ margin: '0 0 1rem 0' }}>Performance Stats</h3>
                    <QuickStats
                        stats={statsState.data}
                        loading={statsState.loading}
                        error={statsState.error}
                    />
                </div>
            </div>

            {/* Tabs */}
            <div className="glass-card" style={{ padding: '0' }}>
                <div style={{
                    display: 'flex',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    overflow: 'auto'
                }}>
                    <button
                        onClick={() => setActiveTab('overview')}
                        style={{
                            flex: 1,
                            padding: '1rem',
                            border: 'none',
                            background: activeTab === 'overview' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                            color: activeTab === 'overview' ? '#818cf8' : 'var(--text-muted)',
                            cursor: 'pointer',
                            fontWeight: '600',
                            borderBottom: activeTab === 'overview' ? '2px solid #818cf8' : 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        📊 Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('data-privacy')}
                        style={{
                            flex: 1,
                            padding: '1rem',
                            border: 'none',
                            background: activeTab === 'data-privacy' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                            color: activeTab === 'data-privacy' ? '#818cf8' : 'var(--text-muted)',
                            cursor: 'pointer',
                            fontWeight: '600',
                            borderBottom: activeTab === 'data-privacy' ? '2px solid #818cf8' : 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        🔒 Data & Privacy
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <>
                    <PerformanceOverview
                        stats={statsState.data}
                        loading={statsState.loading}
                        error={statsState.error}
                    />

                    <PerformanceTrend
                        trends={trendsState.data}
                        loading={trendsState.loading}
                        error={trendsState.error}
                    />

                    <CategoryMastery
                        categoryStats={statsState.data?.categoryStats}
                        loading={statsState.loading}
                        error={statsState.error}
                    />

                    <AchievementsSection
                        achievements={achievementsState.data}
                        loading={achievementsState.loading}
                        error={achievementsState.error}
                    />

                    <RecommendationsSection
                        recommendations={recommendationsState.data}
                        loading={recommendationsState.loading}
                        error={recommendationsState.error}
                    />

                    <RecentActivitySection
                        activity={activityState.data}
                        loading={activityState.loading}
                        error={activityState.error}
                    />
                </>
            )}

            {/* Data & Privacy Tab */}
            {activeTab === 'data-privacy' && (
                <div className="glass-card">
                    <DataManagement />
                </div>
            )}
        </div>
    );
};

export default UserProfile;

