import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import API_URL from '../config';

const GroupChallengeCreator = ({ onClose, onCreated }) => {
    const { user, fetchWithAuth } = useAuth();
    const { showSuccess, showError } = useToast();

    const [quizzes, setQuizzes] = useState([]);
    const [filteredQuizzes, setFilteredQuizzes] = useState([]);
    const [selectedQuiz, setSelectedQuiz] = useState(null);
    const [maxParticipants, setMaxParticipants] = useState(8);
    const [creating, setCreating] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [selectedCategory, setSelectedCategory] = useState('all');

    useEffect(() => {
        fetchQuizzes();
    }, []);

    useEffect(() => {
        filterQuizzes();
    }, [quizzes, activeTab, selectedCategory]);

    const fetchQuizzes = async () => {
        try {
            // Fetch user's quizzes (includes full data with questions)
            const myQuizzesResponse = await fetchWithAuth(`${API_URL}/api/quizzes/my-quizzes`);

            if (!myQuizzesResponse.ok) {
                throw new Error('Failed to fetch quizzes');
            }

            const myQuizzes = await myQuizzesResponse.json();

            // Fetch public quizzes list
            const publicResponse = await fetchWithAuth(`${API_URL}/api/quizzes`);
            const publicQuizzesList = publicResponse.ok ? await publicResponse.json() : [];

            // For public quizzes, fetch full details to get question count
            const publicQuizzesWithDetails = await Promise.all(
                publicQuizzesList
                    .filter(q => !myQuizzes.find(mq => mq.id === q.id)) // Exclude user's own quizzes
                    .map(async (quiz) => {
                        try {
                            const detailResponse = await fetchWithAuth(`${API_URL}/api/quizzes/${quiz.id}`);
                            if (detailResponse.ok) {
                                return await detailResponse.json();
                            }
                            return quiz;
                        } catch {
                            return quiz;
                        }
                    })
            );

            const allQuizzes = [...myQuizzes, ...publicQuizzesWithDetails];

            setQuizzes(allQuizzes);
            setLoading(false);
        } catch (err) {
            showError(err.message);
            setLoading(false);
        }
    };

    const filterQuizzes = () => {
        let filtered = quizzes;

        // Filter by tab
        if (activeTab === 'my-quizzes') {
            filtered = filtered.filter(q => q.creator_id === user.id);
        } else if (activeTab === 'public') {
            filtered = filtered.filter(q => q.creator_id !== user.id);
        }

        // Filter by category
        if (selectedCategory !== 'all') {
            filtered = filtered.filter(q => q.category === selectedCategory);
        }

        setFilteredQuizzes(filtered);
    };

    const categories = ['all', ...new Set(quizzes.map(q => q.category))];

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
            <div className="glass-card" style={{ maxWidth: '700px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0 }}>Create Group Challenge</h2>
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
                        {/* Max Participants */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                                Max Participants: {maxParticipants}
                            </label>
                            <input
                                type="range"
                                min="2"
                                max="8"
                                value={maxParticipants}
                                onChange={(e) => setMaxParticipants(parseInt(e.target.value))}
                                style={{ width: '100%' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                <span>2</span>
                                <span>8</span>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                            {['all', 'my-quizzes', 'public'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    style={{
                                        background: activeTab === tab ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                                        border: activeTab === tab ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                                        color: activeTab === tab ? '#a5b4fc' : 'var(--text-muted)',
                                        padding: '0.5rem 1rem',
                                        fontSize: '0.85rem',
                                        cursor: 'pointer',
                                        borderRadius: '8px',
                                        fontWeight: '600'
                                    }}
                                >
                                    {tab === 'all' ? '🌐 All Quizzes' : tab === 'my-quizzes' ? '📝 My Quizzes' : '🌍 Public'}
                                </button>
                            ))}
                        </div>

                        {/* Category Filter */}
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem' }}>
                                Category
                            </label>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontSize: '0.95rem'
                                }}
                            >
                                {categories.map(cat => (
                                    <option key={cat} value={cat} style={{ background: '#1a1a2e' }}>
                                        {cat === 'all' ? 'All Categories' : cat}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Quiz Selection */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '600' }}>
                                Select Quiz
                            </label>
                            {filteredQuizzes.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                    <p>No quizzes found for the current filters.</p>
                                    {quizzes.length === 0 && <p>Try browsing public quizzes or create your own!</p>}
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflow: 'auto' }}>
                                    {filteredQuizzes.map(quiz => (
                                        <div
                                            key={quiz.id}
                                            onClick={() => setSelectedQuiz(quiz)}
                                            style={{
                                                background: selectedQuiz?.id === quiz.id ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                                border: selectedQuiz?.id === quiz.id ? '2px solid rgba(99, 102, 241, 0.5)' : '1px solid var(--glass-border)',
                                                borderRadius: '8px',
                                                padding: '1rem',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{quiz.title}</div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                {quiz.category} • {quiz.difficulty} • {quiz.questions?.length || 0} questions
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Create Button */}
                        <button
                            onClick={handleCreate}
                            disabled={!selectedQuiz || creating}
                            style={{
                                width: '100%',
                                marginTop: '1.5rem',
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
                    </>
                )}
            </div>
        </div>
    );
};

export default GroupChallengeCreator;
