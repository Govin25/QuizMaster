import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import API_URL from '../config';
import TrendingQuizzes from './TrendingQuizzes';
import TopCreators from './TopCreators';
import PublicUserProfile from './PublicUserProfile';
import { formatDateShort } from '../utils/dateUtils';

const QuizHub = ({ onBack, onViewProfile }) => {
    const { fetchWithAuth } = useAuth();
    const { showSuccess, showError } = useToast();

    // State for recommendations
    const [recommendations, setRecommendations] = useState([]);
    const [loadingRecommendations, setLoadingRecommendations] = useState(true);
    const [hasRecommendations, setHasRecommendations] = useState(false);
    const [displayedRecommendationsCount, setDisplayedRecommendationsCount] = useState(5);

    // State for category-based quizzes
    const [quizzesByCategory, setQuizzesByCategory] = useState({});
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [expandedCategories, setExpandedCategories] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredQuizzes, setFilteredQuizzes] = useState({});
    const [categoryOffsets, setCategoryOffsets] = useState({});
    const [loadingMoreByCategory, setLoadingMoreByCategory] = useState({});
    const [hasMoreByCategory, setHasMoreByCategory] = useState({});

    // Other state
    const [addedQuizzes, setAddedQuizzes] = useState(new Set());
    const [selectedQuiz, setSelectedQuiz] = useState(null);
    const [selectedQuizSource, setSelectedQuizSource] = useState(null);
    const [error, setError] = useState(null);
    const [totalPublicCount, setTotalPublicCount] = useState(0);

    useEffect(() => {
        const loadInitialData = async () => {
            await fetchUserLibrary();
            await fetchRecommendations();
            await fetchQuizzesByCategory();
            await fetchTotalPublicCount();
        };
        loadInitialData();

        // Listen for quiz added events from other components
        const handleQuizAdded = (event) => {
            setAddedQuizzes(prev => new Set([...prev, event.detail.quizId]));
        };
        window.addEventListener('quizAddedToLibrary', handleQuizAdded);

        return () => {
            window.removeEventListener('quizAddedToLibrary', handleQuizAdded);
        };
    }, []);

    // Sync filteredQuizzes when quizzesByCategory changes (show all quizzes, don't hide added ones)
    useEffect(() => {
        if (Object.keys(quizzesByCategory).length > 0 && !searchQuery.trim()) {
            setFilteredQuizzes(quizzesByCategory);
        }
    }, [quizzesByCategory, searchQuery]);

    const fetchRecommendations = async () => {
        try {
            setLoadingRecommendations(true);
            const response = await fetchWithAuth(`${API_URL}/api/quizzes/recommended?limit=10`);
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Session expired');
                }
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to fetch recommendations (${response.status})`);
            }
            const data = await response.json();
            setRecommendations(data);
            setHasRecommendations(data.length > 0);
        } catch (err) {
            console.error('Error fetching recommendations:', err);
            setHasRecommendations(false);
        } finally {
            setLoadingRecommendations(false);
        }
    };

    const fetchTotalPublicCount = async () => {
        try {
            const response = await fetch(`${API_URL}/api/quizzes/public/count`);
            if (response.ok) {
                const data = await response.json();
                setTotalPublicCount(data.count || 0);
            }
        } catch (err) {
            console.error('Error fetching public quiz count:', err);
        }
    };

    const fetchQuizzesByCategory = async () => {
        try {
            setLoadingCategories(true);
            const response = await fetchWithAuth(`${API_URL}/api/quizzes/by-category?limit=10`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to fetch quizzes (${response.status})`);
            }
            const data = await response.json();
            setQuizzesByCategory(data);
            // Don't set filteredQuizzes here - let the useEffect handle it

            // Initialize offsets for each category
            const initialOffsets = {};
            const initialHasMore = {};
            Object.keys(data).forEach(category => {
                initialOffsets[category] = 10; // We've loaded first 10
                initialHasMore[category] = data[category].length === 10; // Has more if we got exactly 10
            });
            setCategoryOffsets(initialOffsets);
            setHasMoreByCategory(initialHasMore);
        } catch (err) {
            setError(`${err.message}`);
        } finally {
            setLoadingCategories(false);
        }
    };

    const loadMoreQuizzes = async (category) => {
        try {
            setLoadingMoreByCategory(prev => ({ ...prev, [category]: true }));
            const currentOffset = categoryOffsets[category] || 0;

            const response = await fetchWithAuth(
                `${API_URL}/api/quizzes/by-category/${encodeURIComponent(category)}?limit=10&offset=${currentOffset}`
            );

            if (!response.ok) {
                throw new Error('Failed to load more quizzes');
            }

            const newQuizzes = await response.json();

            if (newQuizzes.length > 0) {
                // Add new quizzes to the category
                setQuizzesByCategory(prev => ({
                    ...prev,
                    [category]: [...(prev[category] || []), ...newQuizzes]
                }));

                // Update filtered quizzes if not searching
                if (!searchQuery.trim()) {
                    setFilteredQuizzes(prev => ({
                        ...prev,
                        [category]: [...(prev[category] || []), ...newQuizzes]
                    }));
                }

                // Update offset
                setCategoryOffsets(prev => ({
                    ...prev,
                    [category]: currentOffset + newQuizzes.length
                }));

                // Update hasMore flag
                setHasMoreByCategory(prev => ({
                    ...prev,
                    [category]: newQuizzes.length === 10 // Has more if we got exactly 10
                }));
            } else {
                // No more quizzes available
                setHasMoreByCategory(prev => ({
                    ...prev,
                    [category]: false
                }));
            }
        } catch (err) {
            showError(err.message);
        } finally {
            setLoadingMoreByCategory(prev => ({ ...prev, [category]: false }));
        }
    };

    // Filter quizzes based on search query
    const handleSearch = (query) => {
        setSearchQuery(query);

        if (!query.trim()) {
            // Show all quizzes when not searching (consistent with Trending & Recommended)
            setFilteredQuizzes(quizzesByCategory);
            return;
        }

        const lowerQuery = query.toLowerCase().trim();
        const filtered = {};

        Object.entries(quizzesByCategory).forEach(([category, quizzes]) => {
            const matchedQuizzes = quizzes.filter(quiz => {
                // Search by ID (exact or partial match)
                const idMatch = quiz.id.toString().includes(lowerQuery);

                // Search by title
                const titleMatch = quiz.title.toLowerCase().includes(lowerQuery);

                // Search by category
                const categoryMatch = quiz.category.toLowerCase().includes(lowerQuery);

                return idMatch || titleMatch || categoryMatch;
            });

            if (matchedQuizzes.length > 0) {
                filtered[category] = matchedQuizzes;
            }
        });

        setFilteredQuizzes(filtered);
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
            console.error('Error fetching library:', err);
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

    const handleViewDetails = async (quizId, source = 'browse') => {
        try {
            const response = await fetchWithAuth(`${API_URL}/api/quizzes/${quizId}`);
            if (!response.ok) throw new Error('Failed to fetch quiz details');
            const data = await response.json();
            setSelectedQuiz(data);
            setSelectedQuizSource(source);
        } catch (err) {
            showError(err.message);
        }
    };

    const toggleCategory = (category) => {
        setExpandedCategories(prev => ({
            ...prev,
            [category]: !prev[category]
        }));
    };

    // Quiz Card Component (reusable)
    const QuizCard = ({ quiz, source = 'browse' }) => {
        const isAdded = addedQuizzes.has(quiz.id);
        return (
            <div
                className="hover-lift"
                style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    border: '1px solid var(--glass-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                }}
                onClick={() => handleViewDetails(quiz.id, source)}
                onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(99, 102, 241, 0.2)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--glass-border)';
                    e.currentTarget.style.boxShadow = 'none';
                }}
            >
                {/* Title */}
                <h3 style={{
                    margin: 0,
                    fontSize: '1.25rem',
                    color: 'white',
                    lineHeight: '1.4',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    wordBreak: 'break-word'
                }}>
                    {quiz.title}
                </h3>

                {/* Meta Info */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{
                        background: 'rgba(99, 102, 241, 0.2)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        color: '#a5b4fc',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                    }}>
                        {quiz.category}
                    </span>
                    <span style={{
                        background: 'rgba(251, 146, 60, 0.2)',
                        border: '1px solid rgba(251, 146, 60, 0.3)',
                        color: '#fb923c',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                    }}>
                        {quiz.difficulty}
                    </span>
                </div>

                {/* Creator Info */}
                {quiz.creator && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: 'var(--text-muted)',
                        fontSize: '0.85rem'
                    }}>
                        <span>👤</span>
                        <span>by {quiz.creator.username}</span>
                    </div>
                )}

                {/* Quiz ID */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: 'var(--text-muted)',
                    fontSize: '0.85rem'
                }}>
                    <span>🆔</span>
                    <span>ID: {quiz.id}</span>
                </div>

                {/* Question Count */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: 'var(--text-muted)',
                    fontSize: '0.9rem'
                }}>
                    <span>📝</span>
                    <span>{quiz.questionCount || quiz.questions?.length || 0} Questions</span>
                </div>

                {/* Like Count */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: 'var(--text-muted)',
                    fontSize: '0.9rem'
                }}>
                    <span style={{ fontSize: '1.1rem' }}>❤️</span>
                    <span>{parseInt(quiz.likesCount) || 0} {parseInt(quiz.likesCount) === 1 ? 'Like' : 'Likes'}</span>
                </div>

                {/* Click to view hint */}
                <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    fontStyle: 'italic',
                    textAlign: 'center',
                    marginTop: 'auto',
                    paddingTop: '0.5rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                    👁️ Click to view details
                </div>

                {/* Action Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleAddToLibrary(quiz.id);
                    }}
                    disabled={isAdded}
                    style={{
                        width: '100%',
                        background: isAdded
                            ? 'rgba(34, 197, 94, 0.2)'
                            : 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        border: isAdded ? '1px solid rgba(34, 197, 94, 0.3)' : 'none',
                        color: isAdded ? '#22c55e' : 'white',
                        padding: '0.75rem',
                        fontSize: '0.95rem',
                        borderRadius: '12px',
                        fontWeight: '600',
                        cursor: isAdded ? 'default' : 'pointer',
                        transition: 'all 0.3s',
                        opacity: isAdded ? 0.7 : 1
                    }}
                    onMouseEnter={(e) => {
                        if (!isAdded) {
                            e.target.style.transform = 'scale(1.02)';
                            e.target.style.boxShadow = '0 8px 20px rgba(99, 102, 241, 0.3)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.transform = 'scale(1)';
                        e.target.style.boxShadow = 'none';
                    }}
                >
                    {isAdded ? '✓ Added to Home' : '+ Add to Home'}
                </button>
            </div>
        );
    };

    if (error) {
        return (
            <div className="glass-card" style={{ maxWidth: '600px', width: '100%' }}>
                <h2>Quiz Hub</h2>
                <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: '#ef4444',
                    background: 'rgba(239, 68, 68, 0.1)',
                    borderRadius: '12px',
                    border: '1px solid rgba(239, 68, 68, 0.3)'
                }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
                    <div>{error}</div>
                </div>
                <button onClick={onBack} style={{ marginTop: '2rem', width: '100%' }}>Back to Menu</button>
            </div>
        );
    }

    // Quiz Details Modal
    if (selectedQuiz) {
        const isAdded = addedQuizzes.has(selectedQuiz.id);
        const backText = selectedQuizSource === 'trending' ? '← Back to Trending' : '← Back to Quiz Hub';
        return (
            <div className="glass-card" style={{ maxWidth: '800px', width: '100%' }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '2rem'
                }}>
                    <h2 style={{ margin: 0 }}>Quiz Details</h2>
                    <button onClick={() => { setSelectedQuiz(null); setSelectedQuizSource(null); }} style={{
                        background: 'rgba(255,255,255,0.1)',
                        padding: '0.6rem 1.2rem'
                    }}>
                        {backText}
                    </button>
                </div>

                {/* Quiz Header */}
                <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                    <h1 style={{
                        fontSize: '2.5rem',
                        marginBottom: '1rem',
                        background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        {selectedQuiz.title}
                    </h1>

                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '1rem',
                        marginBottom: '1.5rem',
                        flexWrap: 'wrap'
                    }}>
                        <span className="badge" style={{
                            background: 'rgba(99, 102, 241, 0.2)',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            color: '#a5b4fc',
                            padding: '0.5rem 1rem',
                            fontSize: '1rem'
                        }}>
                            {selectedQuiz.category}
                        </span>
                        <span className="badge" style={{
                            background: 'rgba(251, 146, 60, 0.2)',
                            border: '1px solid rgba(251, 146, 60, 0.3)',
                            color: '#fb923c',
                            padding: '0.5rem 1rem',
                            fontSize: '1rem'
                        }}>
                            {selectedQuiz.difficulty}
                        </span>
                    </div>

                    {selectedQuiz.creator && (
                        <div style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                            Created by <span style={{ color: 'white', fontWeight: '600' }}>{selectedQuiz.creator.username}</span>
                        </div>
                    )}
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                        Quiz ID: <span style={{
                            color: '#a5b4fc',
                            fontWeight: '600',
                            background: 'rgba(99, 102, 241, 0.1)',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '6px',
                            fontFamily: 'monospace'
                        }}>{selectedQuiz.id}</span>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid" style={{
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '1rem',
                    marginBottom: '2rem'
                }}>
                    <div style={{
                        background: 'rgba(255,255,255,0.03)',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        textAlign: 'center',
                        border: '1px solid var(--glass-border)'
                    }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📝</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                            {selectedQuiz.questions?.length || 0}
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Questions</div>
                    </div>
                    <div style={{
                        background: 'rgba(255,255,255,0.03)',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        textAlign: 'center',
                        border: '1px solid var(--glass-border)'
                    }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>❤️</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                            {selectedQuiz.likesCount || 0}
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Likes</div>
                    </div>
                    <div style={{
                        background: 'rgba(255,255,255,0.03)',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        textAlign: 'center',
                        border: '1px solid var(--glass-border)'
                    }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📅</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                            {formatDateShort(selectedQuiz.created_at)}
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Created</div>
                    </div>
                </div>

                {/* Description & Takeaways */}
                <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    padding: '2rem',
                    borderRadius: '16px',
                    marginBottom: '2rem',
                    border: '1px solid var(--glass-border)'
                }}>
                    <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#c084fc' }}>✨ About this Quiz</h3>
                    <p style={{ lineHeight: '1.6', color: 'var(--text-muted)', marginBottom: '2rem' }}>
                        Ready to challenge yourself? Dive into this <strong>{selectedQuiz.difficulty}</strong> level quiz designed to test your mastery of <strong>{selectedQuiz.category}</strong>.
                        {selectedQuiz.creator ? ` Created by community member ${selectedQuiz.creator.username}, ` : ' '}
                        this quiz features {selectedQuiz.questions?.length || 0} carefully selected questions to help you sharpen your skills and learn something new.
                    </p>

                    <h4 style={{ marginBottom: '1rem', color: 'white' }}>🎯 What you'll get:</h4>
                    <ul style={{
                        listStyle: 'none',
                        padding: 0,
                        margin: 0,
                        display: 'grid',
                        gap: '0.8rem'
                    }}>
                        <li style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', color: 'var(--text-muted)' }}>
                            <span style={{ color: '#22c55e' }}>✓</span>
                            Test your knowledge in {selectedQuiz.category}
                        </li>
                        <li style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', color: 'var(--text-muted)' }}>
                            <span style={{ color: '#22c55e' }}>✓</span>
                            Challenge yourself with {selectedQuiz.difficulty} level questions
                        </li>
                        <li style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', color: 'var(--text-muted)' }}>
                            <span style={{ color: '#22c55e' }}>✓</span>
                            Track your progress and improve over time
                        </li>
                    </ul>
                </div>

                {/* Add to Home Button */}
                <div style={{ textAlign: 'center' }}>
                    <button
                        onClick={() => handleAddToLibrary(selectedQuiz.id)}
                        disabled={isAdded}
                        style={{
                            width: '100%',
                            maxWidth: '400px',
                            background: isAdded
                                ? 'rgba(34, 197, 94, 0.2)'
                                : 'linear-gradient(135deg, var(--primary), var(--secondary))',
                            border: isAdded ? '1px solid rgba(34, 197, 94, 0.3)' : 'none',
                            color: isAdded ? '#22c55e' : 'white',
                            padding: '1rem 2rem',
                            fontSize: '1.1rem',
                            borderRadius: '12px',
                            cursor: isAdded ? 'default' : 'pointer',
                            opacity: isAdded ? 0.7 : 1,
                            fontWeight: '600',
                            boxShadow: isAdded ? 'none' : '0 4px 15px rgba(99, 102, 241, 0.3)',
                            transition: 'all 0.3s'
                        }}
                    >
                        {isAdded ? '✓ Added to Home' : '➕ Add to Home'}
                    </button>
                    {!isAdded && (
                        <p style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            Add this quiz to your personal library to take it anytime!
                        </p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="glass-card" style={{ maxWidth: '1200px', width: '100%' }}>
            {/* Header with Back Button */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                gap: '1rem',
                flexWrap: 'wrap'
            }}>
                <h2 style={{ margin: 0 }}>
                    🌐 Quiz Hub
                    {totalPublicCount > 0 && (
                        <span style={{
                            marginLeft: '0.75rem',
                            fontSize: '1rem',
                            fontWeight: '500',
                            color: 'var(--text-muted)',
                            background: 'rgba(255, 255, 255, 0.1)',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '20px'
                        }}>
                            {totalPublicCount}
                        </span>
                    )}
                </h2>
                <button onClick={onBack} style={{
                    background: 'rgba(255,255,255,0.1)',
                    padding: '0.6rem 1.2rem'
                }}>
                    ← Back
                </button>
            </div>

            {/* Global Search Bar - Prominent at the top */}
            <div style={{
                marginBottom: '2rem',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))',
                borderRadius: '16px',
                padding: '1.5rem',
                border: '1px solid rgba(139, 92, 246, 0.2)'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '0.75rem'
                }}>
                    <span style={{ fontSize: '1.5rem' }}>🔍</span>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'white' }}>Find Your Perfect Quiz</h3>
                </div>
                <div style={{
                    position: 'relative',
                    background: 'rgba(15, 23, 42, 0.6)',
                    borderRadius: '12px',
                    border: '1px solid var(--glass-border)',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease'
                }}
                    onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--primary)';
                        e.currentTarget.style.boxShadow = '0 0 20px rgba(139, 92, 246, 0.3)';
                    }}
                    onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--glass-border)';
                        e.currentTarget.style.boxShadow = 'none';
                    }}>
                    <input
                        type="text"
                        placeholder="Search by Quiz ID, title, category, or creator..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '1rem 3rem 1rem 1rem',
                            background: 'transparent',
                            border: 'none',
                            color: 'white',
                            fontSize: '1rem',
                            outline: 'none',
                            margin: 0
                        }}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => handleSearch('')}
                            style={{
                                position: 'absolute',
                                right: '1rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                fontSize: '1.2rem',
                                cursor: 'pointer',
                                padding: '0.5rem'
                            }}
                        >
                            ✕
                        </button>
                    )}
                </div>
                <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    marginTop: '0.75rem',
                    flexWrap: 'wrap'
                }}>
                    <span style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        background: 'rgba(255, 255, 255, 0.05)',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '6px'
                    }}>
                        💡 Try: "Science", "123", or "JavaScript"
                    </span>
                </div>
            </div>

            {/* Trending Quizzes Section - Hide when searching */}
            {!searchQuery.trim() && (
                <div style={{ marginBottom: '2rem' }}>
                    <TrendingQuizzes
                        onViewDetails={(quizId) => handleViewDetails(quizId, 'trending')}
                        selectedQuiz={selectedQuiz}
                        selectedQuizSource={selectedQuizSource}
                    />
                </div>
            )}

            {/* Top Creators Section - Hide when searching */}
            {!searchQuery.trim() && (
                <div style={{ marginBottom: '2rem' }}>
                    <TopCreators onViewProfile={onViewProfile} />
                </div>
            )}


            {/* Recommended for You Section - Hide when searching */}
            {hasRecommendations && !searchQuery.trim() && (
                <div className="glass-card" style={{ marginBottom: '2rem' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '1.5rem',
                        flexWrap: 'wrap',
                        gap: '0.5rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <h2 style={{ margin: 0 }}>✨ Recommended for You</h2>
                            <span style={{
                                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                                color: 'white',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: '600'
                            }}>
                                Personalized
                            </span>
                        </div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            {Math.min(displayedRecommendationsCount, recommendations.length)} of {recommendations.length}
                        </span>
                    </div>

                    {loadingRecommendations ? (
                        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                            {[1, 2, 3].map(i => (
                                <div key={i} className="skeleton" style={{ height: '350px', borderRadius: '16px' }} />
                            ))}
                        </div>
                    ) : (
                        <>
                            <div className="grid" style={{
                                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                gap: '1.5rem',
                                marginBottom: displayedRecommendationsCount < recommendations.length ? '1.5rem' : 0
                            }}>
                                {recommendations.slice(0, displayedRecommendationsCount).map(quiz => (
                                    <QuizCard key={quiz.id} quiz={quiz} source="recommended" />
                                ))}
                            </div>
                            {displayedRecommendationsCount < recommendations.length && (
                                <button
                                    onClick={() => setDisplayedRecommendationsCount(prev => prev + 5)}
                                    style={{
                                        width: '100%',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid var(--glass-border)',
                                        color: 'white',
                                        padding: '0.75rem',
                                        fontSize: '0.95rem',
                                        borderRadius: '12px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                                        e.target.style.borderColor = 'var(--primary)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                                        e.target.style.borderColor = 'var(--glass-border)';
                                    }}
                                >
                                    ▼ Load More Recommendations
                                </button>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Browse by Category Section / Search Results */}
            <div className="glass-card" style={{ marginBottom: '2rem' }}>
                <h2 style={{ marginBottom: '1.5rem' }}>
                    {searchQuery.trim() ? `� Search Results for "${searchQuery}"` : '�📚 Browse by Category'}
                </h2>

                {loadingCategories ? (
                    <div style={{ display: 'grid', gap: '2rem' }}>
                        {[1, 2, 3].map(i => (
                            <div key={i}>
                                <div className="skeleton" style={{ height: '40px', width: '200px', marginBottom: '1rem', borderRadius: '8px' }} />
                                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                                    {[1, 2].map(j => (
                                        <div key={j} className="skeleton" style={{ height: '350px', borderRadius: '16px' }} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : Object.keys(filteredQuizzes).length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '4rem 2rem',
                        color: 'var(--text-muted)'
                    }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📚</div>
                        <h3>{searchQuery ? 'No quizzes found' : 'No quizzes available yet'}</h3>
                        <p>{searchQuery ? 'Try a different search term or Quiz ID' : 'Check back soon for new quizzes!'}</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '2rem' }}>
                        {Object.entries(filteredQuizzes).map(([category, quizzes]) => {

                            return (
                                <div key={category} style={{
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    borderRadius: '16px',
                                    padding: '2rem',
                                    border: '1px solid var(--glass-border)'
                                }}>
                                    {/* Category Header */}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '1.5rem'
                                    }}>
                                        <h3 style={{
                                            margin: 0,
                                            fontSize: '1.5rem',
                                            background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent'
                                        }}>
                                            {category}
                                        </h3>
                                        <span style={{
                                            color: 'var(--text-muted)',
                                            fontSize: '0.9rem'
                                        }}>
                                            {quizzes.length} {quizzes.length === 1 ? 'quiz' : 'quizzes'}
                                        </span>
                                    </div>

                                    {/* Quiz Grid */}
                                    <div className="grid" style={{
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                        gap: '1.5rem',
                                        marginBottom: hasMoreByCategory[category] ? '1.5rem' : 0
                                    }}>
                                        {quizzes.map(quiz => (
                                            <QuizCard key={quiz.id} quiz={quiz} source="category" />
                                        ))}
                                    </div>

                                    {/* View More Button */}
                                    {!searchQuery && hasMoreByCategory[category] && (
                                        <button
                                            onClick={() => loadMoreQuizzes(category)}
                                            disabled={loadingMoreByCategory[category]}
                                            style={{
                                                width: '100%',
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                border: '1px solid var(--glass-border)',
                                                color: 'white',
                                                padding: '0.75rem',
                                                fontSize: '0.95rem',
                                                borderRadius: '12px',
                                                fontWeight: '600',
                                                cursor: loadingMoreByCategory[category] ? 'not-allowed' : 'pointer',
                                                transition: 'all 0.3s',
                                                opacity: loadingMoreByCategory[category] ? 0.6 : 1
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!loadingMoreByCategory[category]) {
                                                    e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                                                    e.target.style.borderColor = 'var(--primary)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                                                e.target.style.borderColor = 'var(--glass-border)';
                                            }}
                                        >
                                            {loadingMoreByCategory[category] ? '⏳ Loading...' : '▼ Load More Quizzes'}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuizHub;
