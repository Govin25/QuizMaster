import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import API_URL from '../config';

const GroupChallengeCreator = ({ onClose, onCreated }) => {
    const { user, fetchWithAuth } = useAuth();
    const { showSuccess, showError } = useToast();

    const [myQuizzes, setMyQuizzes] = useState([]);
    const [publicQuizzes, setPublicQuizzes] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [filteredQuizzes, setFilteredQuizzes] = useState([]);
    const [selectedQuiz, setSelectedQuiz] = useState(null);
    const [maxParticipants, setMaxParticipants] = useState(8);
    const [creating, setCreating] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const searchTimeoutRef = useRef(null);
    const modalContentRef = useRef(null);

    // Handle browser back button for mobile
    useEffect(() => {
        // Push initial state when modal opens
        window.history.pushState({ modal: 'group-challenge-creator' }, '');

        const handlePopState = (event) => {
            // Close the modal when back is pressed
            onClose();
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [onClose]);

    // Initial fetch - user's quizzes + limited public quizzes
    useEffect(() => {
        fetchInitialQuizzes();
    }, []);

    // Filter quizzes when tab or data changes
    useEffect(() => {
        applyFilters();
    }, [myQuizzes, publicQuizzes, searchResults, activeTab, searchQuery]);

    const fetchInitialQuizzes = async () => {
        try {
            // Fetch user's quizzes
            const myQuizzesResponse = await fetchWithAuth(`${API_URL}/api/quizzes/my-quizzes`);
            if (!myQuizzesResponse.ok) {
                throw new Error('Failed to fetch quizzes');
            }
            const myQuizzesData = await myQuizzesResponse.json();
            setMyQuizzes(myQuizzesData);

            // Fetch public quizzes with limit (handled by backend now)
            const publicResponse = await fetchWithAuth(`${API_URL}/api/quizzes/public?limit=50`);
            if (publicResponse.ok) {
                const publicData = await publicResponse.json();
                // Filter out user's own quizzes (backend already limits to 50)
                const filteredPublic = (Array.isArray(publicData) ? publicData : [])
                    .filter(q => !myQuizzesData.find(mq => mq.id === q.id));
                setPublicQuizzes(filteredPublic);
            }

            setLoading(false);
        } catch (err) {
            showError(err.message);
            setLoading(false);
        }
    };

    // Debounced search for public quizzes
    const searchPublicQuizzes = useCallback(async (query) => {
        if (!query || query.length < 3) {
            setSearchResults([]);
            setSearching(false);
            return;
        }

        setSearching(true);
        try {
            // Search by quiz ID if query is numeric
            const isNumeric = /^\d+$/.test(query.trim());

            if (isNumeric) {
                // Try to fetch specific quiz by ID
                const response = await fetchWithAuth(`${API_URL}/api/quizzes/${query.trim()}`);
                if (response.ok) {
                    const quiz = await response.json();
                    // Only add if not already in myQuizzes
                    if (!myQuizzes.find(mq => mq.id === quiz.id)) {
                        setSearchResults([quiz]);
                    } else {
                        setSearchResults([]);
                    }
                } else {
                    setSearchResults([]);
                }
            } else {
                // For text search, filter from already loaded quizzes
                // (Backend search would be better but using local filter for now)
                setSearchResults([]);
            }
        } catch (err) {
            console.error('Search failed:', err);
            setSearchResults([]);
        } finally {
            setSearching(false);
        }
    }, [myQuizzes, fetchWithAuth]);

    // Handle search input with debounce
    const handleSearchChange = (value) => {
        setSearchQuery(value);

        // Clear previous timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // Debounce search API call
        if (value.length >= 3) {
            searchTimeoutRef.current = setTimeout(() => {
                searchPublicQuizzes(value);
            }, 300);
        } else {
            setSearchResults([]);
        }
    };

    const applyFilters = () => {
        let allQuizzes = [];

        if (activeTab === 'my-quizzes') {
            allQuizzes = [...myQuizzes];
        } else {
            // Combine all sources, avoiding duplicates
            const quizMap = new Map();

            myQuizzes.forEach(q => quizMap.set(q.id, q));
            publicQuizzes.forEach(q => {
                if (!quizMap.has(q.id)) quizMap.set(q.id, q);
            });
            searchResults.forEach(q => {
                if (!quizMap.has(q.id)) quizMap.set(q.id, q);
            });

            allQuizzes = Array.from(quizMap.values());
        }

        // Apply local text filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            allQuizzes = allQuizzes.filter(q => {
                const idMatch = q.id.toString().includes(query);
                const titleMatch = q.title.toLowerCase().includes(query);
                const categoryMatch = q.category.toLowerCase().includes(query);
                return idMatch || titleMatch || categoryMatch;
            });
        }

        setFilteredQuizzes(allQuizzes);
    };

    const handleCreate = async () => {
        if (!selectedQuiz) {
            showError('Please select a quiz');
            return;
        }

        try {
            setCreating(true);
            const response = await fetchWithAuth(`${API_URL}/api/group-challenges/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    quizId: selectedQuiz.id,
                    maxParticipants
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create room');
            }

            const data = await response.json();
            showSuccess(`Room created! Code: ${data.room.room_code}`);
            onCreated(data.room);
        } catch (err) {
            showError(err.message);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
        }}>
            <div ref={modalContentRef} className="glass-card" style={{ maxWidth: '700px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0 }}>Select a Quiz</h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'white',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            padding: '0.5rem'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>Loading quizzes...</div>
                ) : (
                    <>
                        {/* Search Box - First like 1v1 */}
                        <div style={{ marginBottom: '1rem' }}>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                    placeholder="Search by Quiz ID, title, or category..."
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 2.5rem 0.75rem 1rem',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: '8px',
                                        color: 'white',
                                        fontSize: '1rem'
                                    }}
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => handleSearchChange('')}
                                        style={{
                                            position: 'absolute',
                                            right: '0.5rem',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'var(--text-muted)',
                                            cursor: 'pointer',
                                            fontSize: '1.2rem',
                                            padding: '0.25rem 0.5rem'
                                        }}
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Filter Toggle - After search like 1v1 */}
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                            {['all', 'my-quizzes'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    style={{
                                        flex: 1,
                                        background: activeTab === tab ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                        border: activeTab === tab ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid var(--glass-border)',
                                        color: activeTab === tab ? '#a5b4fc' : 'var(--text-muted)',
                                        padding: '0.5rem',
                                        fontSize: '0.85rem',
                                        cursor: 'pointer',
                                        borderRadius: '8px',
                                        fontWeight: '600',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {tab === 'all' ? '🌐 All Quizzes' : '📝 My Quizzes'}
                                </button>
                            ))}
                        </div>



                        {/* Quiz List */}
                        {filteredQuizzes.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                <p>No quizzes found for the current filters.</p>
                                {myQuizzes.length === 0 && <p>Create your own quiz first!</p>}
                            </div>
                        ) : (
                            <div style={{
                                display: 'grid',
                                gap: '1rem',
                                maxHeight: '300px',
                                overflowY: 'auto',
                                padding: '0.5rem'
                            }}>
                                {filteredQuizzes.map(quiz => (
                                    <div
                                        key={quiz.id}
                                        onClick={() => {
                                            setSelectedQuiz(quiz);
                                            // Scroll to top so Create Room button is visible
                                            if (modalContentRef.current) {
                                                modalContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                                            }
                                        }}
                                        style={{
                                            background: selectedQuiz?.id === quiz.id ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                            border: selectedQuiz?.id === quiz.id ? '2px solid rgba(99, 102, 241, 0.5)' : '1px solid var(--glass-border)',
                                            borderRadius: '8px',
                                            padding: '1rem',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{quiz.title}</div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                    <span style={{
                                                        fontFamily: 'monospace',
                                                        background: 'rgba(99, 102, 241, 0.1)',
                                                        padding: '0.1rem 0.4rem',
                                                        borderRadius: '4px'
                                                    }}>
                                                        🆔 {quiz.id}
                                                    </span>
                                                    <span>{quiz.category}</span>
                                                    <span>•</span>
                                                    <span>{quiz.difficulty}</span>
                                                    <span>•</span>
                                                    <span>{quiz.questionCount || quiz.questions?.length || 0} questions</span>
                                                </div>
                                            </div>
                                            {selectedQuiz?.id === quiz.id && (
                                                <div style={{ fontSize: '1.5rem' }}>✅</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Sticky Footer */}
                        <div style={{
                            position: 'sticky',
                            bottom: 0,
                            background: 'linear-gradient(to top, var(--card-bg, rgba(30, 30, 50, 1)) 80%, transparent)',
                            paddingTop: '1rem',
                            marginTop: '1rem'
                        }}>
                            <button
                                onClick={handleCreate}
                                disabled={!selectedQuiz || creating}
                                style={{
                                    width: '100%',
                                    background: selectedQuiz && !creating ? 'linear-gradient(135deg, var(--primary), var(--secondary))' : 'rgba(100, 116, 139, 0.2)',
                                    border: 'none',
                                    color: 'white',
                                    padding: '1rem',
                                    fontSize: '1rem',
                                    cursor: selectedQuiz && !creating ? 'pointer' : 'not-allowed',
                                    borderRadius: '8px',
                                    fontWeight: '600',
                                    opacity: selectedQuiz && !creating ? 1 : 0.5
                                }}
                            >
                                {creating ? 'Creating...' : '🚀 Create Room'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default GroupChallengeCreator;
