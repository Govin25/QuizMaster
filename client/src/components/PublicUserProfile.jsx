import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import API_URL from '../config';
import ProfileHeader from './profile/ProfileHeader';
import QuickStats from './profile/QuickStats';
import PerformanceOverview from './profile/PerformanceOverview';
import PerformanceTrend from './profile/PerformanceTrend';
import CategoryMastery from './profile/CategoryMastery';
import AchievementsSection from './profile/AchievementsSection';
import RecommendationsSection from './profile/RecommendationsSection';
import RecentActivitySection from './profile/RecentActivitySection';
import { FollowButton, SocialStats, LikeButton } from './SocialFeatures';

const PublicUserProfile = ({ userId, onBack }) => {
    const { user: currentUser, logout, fetchWithAuth } = useAuth();
    const { showError, showSuccess } = useToast();

    const [userData, setUserData] = useState(null);
    const [statsState, setStatsState] = useState({ data: null, loading: true, error: null });
    const [activityState, setActivityState] = useState({ data: null, loading: true, error: null });
    const [trendsState, setTrendsState] = useState({ data: [], loading: true, error: null });
    const [achievementsState, setAchievementsState] = useState({ data: null, loading: true, error: null });
    const [recommendationsState, setRecommendationsState] = useState({ data: [], loading: true, error: null });
    const [showComparison, setShowComparison] = useState(false);
    const [comparisonData, setComparisonData] = useState(null);
    const [socialProfile, setSocialProfile] = useState(null);
    const [userQuizzes, setUserQuizzes] = useState([]);
    const [quizzesLoading, setQuizzesLoading] = useState(true);
    const [addedQuizzes, setAddedQuizzes] = useState(new Set());

    useEffect(() => {
        if (userId) {
            fetchAllData();
        }
    }, [userId]);

    const fetchAllData = () => {
        fetchUserData();
        fetchStats();
        fetchActivity();
        fetchTrends();
        fetchAchievements();
        fetchRecommendations();
        fetchSocialProfile();
        fetchUserQuizzes();
        fetchUserLibrary();
    };

    const handleFetchError = (res) => {
        if (res.status === 401 || res.status === 403) {
            showError('Session expired. Please login again.');
            logout();
            return true;
        }
        return false;
    };

    const fetchUserData = async () => {
        try {
            const res = await fetchWithAuth(`${API_URL}/api/profile/user/${userId}`);
            if (handleFetchError(res)) return;
            if (!res.ok) throw new Error('Failed to fetch user data');
            const data = await res.json();
            setUserData(data);
        } catch (err) {
            console.error(err);
            showError('Failed to load user profile');
        }
    };

    const fetchStats = async () => {
        try {
            setStatsState(prev => ({ ...prev, loading: true, error: null }));
            const res = await fetchWithAuth(`${API_URL}/api/profile/stats/${userId}`);
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
            const res = await fetchWithAuth(`${API_URL}/api/profile/activity/${userId}`);
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
            const res = await fetchWithAuth(`${API_URL}/api/profile/trends/${userId}?days=30`);
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
            const res = await fetchWithAuth(`${API_URL}/api/profile/achievements/${userId}`);
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
            const res = await fetchWithAuth(`${API_URL}/api/profile/recommendations/${userId}`);
            if (handleFetchError(res)) return;
            if (!res.ok) throw new Error('Failed to fetch recommendations');
            const data = await res.json();
            setRecommendationsState({ data: data.recommendations || [], loading: false, error: null });
        } catch (err) {
            console.error(err);
            setRecommendationsState(prev => ({ ...prev, loading: false, error: err.message }));
        }
    };

    const handleCompareWithMe = async () => {
        try {
            const res = await fetchWithAuth(`${API_URL}/api/profile/compare/${currentUser.id}/${userId}`);
            if (handleFetchError(res)) return;
            if (!res.ok) throw new Error('Failed to fetch comparison data');
            const data = await res.json();
            setComparisonData(data);
            setShowComparison(true);
        } catch (err) {
            console.error(err);
            showError('Failed to load comparison data');
        }
    };

    const fetchSocialProfile = async () => {
        try {
            const res = await fetch(`${API_URL}/api/social/profile/${userId}`);
            if (res.ok) {
                const data = await res.json();
                setSocialProfile(data);
            }
        } catch (err) {
            console.error('Failed to fetch social profile:', err);
        }
    };

    const fetchUserQuizzes = async () => {
        try {
            setQuizzesLoading(true);
            const res = await fetch(`${API_URL}/api/social/profile/${userId}/quizzes?limit=6`);
            if (res.ok) {
                const data = await res.json();
                setUserQuizzes(data);
            }
        } catch (err) {
            console.error('Failed to fetch user quizzes:', err);
        } finally {
            setQuizzesLoading(false);
        }
    };

    const fetchUserLibrary = async () => {
        try {
            const response = await fetchWithAuth(`${API_URL}/api/quizzes/my-library`);
            if (response.ok) {
                const data = await response.json();
                const allLibraryQuizzes = [...data.recentlyAdded, ...data.completed];
                const quizIds = new Set(allLibraryQuizzes.map(q => q.id));
                setAddedQuizzes(quizIds);
            }
        } catch (err) {
            console.error('Failed to fetch library:', err);
        }
    };

    const handleAddToLibrary = async (quizId) => {
        try {
            const response = await fetchWithAuth(`${API_URL}/api/quizzes/${quizId}/add-to-library`, {
                method: 'POST'
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to add quiz');
            }
            showSuccess('Quiz added to your home!');
            setAddedQuizzes(prev => new Set([...prev, quizId]));

            // Dispatch event to notify other components
            window.dispatchEvent(new CustomEvent('quizAddedToLibrary', { detail: { quizId } }));
        } catch (err) {
            showError(err.message);
        }
    };

    if (!userData) {
        return (
            <div className="glass-card" style={{ maxWidth: '1200px', width: '100%', textAlign: 'center', padding: '3rem' }}>
                <div className="loading-spinner" style={{ margin: '0 auto' }}>Loading profile...</div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '1200px', width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem', position: 'relative' }}>

            {/* Header & Quick Stats */}
            <div className="glass-card">
                <ProfileHeader
                    user={userData}
                    userStats={statsState.data?.userStats}
                    onBack={onBack}
                    isPublicView={true}
                />

                {/* Social Stats & Follow Button */}
                {socialProfile && (
                    <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0 }}>Social</h3>
                            {currentUser.id !== userId && (
                                <FollowButton
                                    userId={userId}
                                    initialFollowing={socialProfile.isFollowing || false}
                                />
                            )}
                        </div>
                        <SocialStats
                            followers={socialProfile.socialStats?.followers || 0}
                            following={socialProfile.socialStats?.following || 0}
                            quizzesCreated={socialProfile.socialStats?.quizzesCreated || 0}
                            totalLikes={socialProfile.socialStats?.totalLikes || 0}
                        />
                    </div>
                )}

                <QuickStats
                    stats={statsState.data}
                    loading={statsState.loading}
                    error={statsState.error}
                />
            </div>

            {/* Compare Button */}
            {currentUser.id !== userId && (
                <div className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
                    <button
                        onClick={handleCompareWithMe}
                        style={{
                            padding: '0.75rem 2rem',
                            borderRadius: '12px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: '600',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                        }}
                    >
                        📊 Compare with Me
                    </button>
                </div>
            )}

            {/* Comparison Results */}
            {showComparison && comparisonData && (
                <div className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: 0 }}>📊 Comparison</h3>
                        <button
                            onClick={() => setShowComparison(false)}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '8px',
                                border: '1px solid var(--glass-border)',
                                background: 'rgba(255,255,255,0.05)',
                                color: 'var(--text-muted)',
                                cursor: 'pointer'
                            }}
                        >
                            Close
                        </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Quizzes Completed</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: comparisonData.comparison.quizzesDiff >= 0 ? '#10b981' : '#ef4444' }}>
                                {comparisonData.comparison.quizzesDiff >= 0 ? '+' : ''}{comparisonData.comparison.quizzesDiff}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                You: {comparisonData.user1.totalQuizzes} | Them: {comparisonData.user2.totalQuizzes}
                            </div>
                        </div>
                        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Avg Score</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: comparisonData.comparison.scoreDiff >= 0 ? '#10b981' : '#ef4444' }}>
                                {comparisonData.comparison.scoreDiff >= 0 ? '+' : ''}{comparisonData.comparison.scoreDiff.toFixed(1)}%
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                You: {comparisonData.user1.avgScore}% | Them: {comparisonData.user2.avgScore}%
                            </div>
                        </div>
                        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Rank Difference</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: comparisonData.comparison.rankDiff <= 0 ? '#10b981' : '#ef4444' }}>
                                {comparisonData.comparison.rankDiff <= 0 ? '' : '+'}{comparisonData.comparison.rankDiff}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                You: #{comparisonData.user1.rank.rank} | Them: #{comparisonData.user2.rank.rank}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Profile Content */}
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

            {/* Created Quizzes Section */}
            <div className="glass-card">
                <h3 style={{ marginBottom: '1.5rem' }}>📝 Created Quizzes</h3>
                {quizzesLoading ? (
                    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                        {[1, 2, 3].map(i => (
                            <div key={i} className="skeleton" style={{ height: '150px', borderRadius: '12px' }} />
                        ))}
                    </div>
                ) : userQuizzes.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📚</div>
                        <p>No public quizzes created yet</p>
                    </div>
                ) : (
                    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                        {userQuizzes.map(quiz => (
                            <div key={quiz.id} style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                borderRadius: '12px',
                                padding: '1rem',
                                border: '1px solid var(--glass-border)',
                                transition: 'all 0.3s',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.75rem'
                            }}
                                className="hover-lift">
                                <h4 style={{ margin: 0, fontSize: '1rem' }}>{quiz.title}</h4>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <span style={{
                                        background: 'rgba(99, 102, 241, 0.2)',
                                        border: '1px solid rgba(99, 102, 241, 0.3)',
                                        color: '#a5b4fc',
                                        padding: '0.2rem 0.6rem',
                                        borderRadius: '8px',
                                        fontSize: '0.7rem',
                                        fontWeight: '600'
                                    }}>{quiz.category}</span>
                                    <span style={{
                                        background: 'rgba(251, 146, 60, 0.2)',
                                        border: '1px solid rgba(251, 146, 60, 0.3)',
                                        color: '#fb923c',
                                        padding: '0.2rem 0.6rem',
                                        borderRadius: '8px',
                                        fontSize: '0.7rem',
                                        fontWeight: '600'
                                    }}>{quiz.difficulty}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    <span>📝 {quiz.questionCount || 0} questions</span>
                                    <span>❤️ {quiz.likesCount || 0} likes</span>
                                </div>
                                {currentUser.id !== userId && (
                                    <button
                                        onClick={() => handleAddToLibrary(quiz.id)}
                                        disabled={addedQuizzes.has(quiz.id)}
                                        style={{
                                            padding: '0.6rem',
                                            borderRadius: '8px',
                                            border: 'none',
                                            background: addedQuizzes.has(quiz.id)
                                                ? 'rgba(34, 197, 94, 0.2)'
                                                : 'linear-gradient(135deg, var(--primary), var(--secondary))',
                                            color: addedQuizzes.has(quiz.id) ? '#22c55e' : 'white',
                                            fontSize: '0.85rem',
                                            fontWeight: '600',
                                            cursor: addedQuizzes.has(quiz.id) ? 'default' : 'pointer',
                                            transition: 'all 0.3s',
                                            opacity: addedQuizzes.has(quiz.id) ? 0.7 : 1
                                        }}
                                    >
                                        {addedQuizzes.has(quiz.id) ? '✓ Added to Home' : '+ Add to Home'}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div >
    );
};

export default PublicUserProfile;
