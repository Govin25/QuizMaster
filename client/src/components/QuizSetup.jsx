import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import API_URL from '../config';

const QuizSetup = ({ onStartQuiz, onViewAttempts }) => {
    const { user } = useAuth();
    const [quizzes, setQuizzes] = useState([]);
    const [results, setResults] = useState({});
    const [loading, setLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'completed', 'pending'

    useEffect(() => {
        Promise.all([
            fetch(`${API_URL}/api/quizzes`).then(res => res.json()),
            fetch(`${API_URL}/api/results/${user.id}`).then(res => res.json())
        ])
            .then(([quizzesData, resultsData]) => {
                setQuizzes(quizzesData);
                // Convert results array to map for easier lookup: { quiz_id: { best_score, attempts } }
                const resultsMap = {};
                resultsData.forEach(r => {
                    resultsMap[r.quiz_id] = r;
                });
                setResults(resultsMap);
                setLoading(false);
            })
            .catch(err => console.error(err));
    }, [user.id]);

    if (loading) return <div>Loading quizzes...</div>;

    // Filter quizzes
    const filteredQuizzes = quizzes.filter(quiz => {
        const matchesSearch = (quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            quiz.category.toLowerCase().includes(searchQuery.toLowerCase()));

        const isCompleted = !!results[quiz.id];
        let matchesStatus = true;
        if (statusFilter === 'completed') matchesStatus = isCompleted;
        if (statusFilter === 'pending') matchesStatus = !isCompleted;

        return matchesSearch && matchesStatus;
    });

    // Group filtered quizzes by category
    const categories = {};
    filteredQuizzes.forEach(quiz => {
        if (!categories[quiz.category]) {
            categories[quiz.category] = [];
        }
        categories[quiz.category].push(quiz);
    });

    return (
        <div className="glass-card" style={{ width: '100%', maxWidth: '1000px', textAlign: 'left' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Select a Quiz</h2>

            {/* Filters */}
            <div style={{
                display: 'flex',
                gap: '1rem',
                marginBottom: '2rem',
                flexWrap: 'wrap',
                background: 'rgba(255,255,255,0.03)',
                padding: '1rem',
                borderRadius: '12px'
            }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <input
                        type="text"
                        placeholder="Search quizzes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
                    />
                </div>
                <div style={{ minWidth: '150px', position: 'relative' }}>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
                    >
                        <option value="all">All Status</option>
                        <option value="completed">Completed</option>
                        <option value="pending">Not Completed</option>
                    </select>
                </div>
            </div>

            {Object.keys(categories).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No quizzes found matching your filters.
                </div>
            ) : (
                Object.entries(categories).map(([category, categoryQuizzes]) => (
                    <div key={category} style={{ marginBottom: '3rem' }}>
                        <h3 style={{
                            borderBottom: '1px solid var(--glass-border)',
                            paddingBottom: '0.5rem',
                            marginBottom: '1.5rem',
                            color: 'var(--primary)'
                        }}>
                            {category}
                        </h3>
                        <div className="grid">
                            {categoryQuizzes.map(quiz => {
                                const result = results[quiz.id];
                                const isCompleted = !!result;

                                return (
                                    <div key={quiz.id} style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        padding: '1.5rem',
                                        borderRadius: '12px',
                                        position: 'relative',
                                        border: isCompleted ? '1px solid rgba(34, 197, 94, 0.3)' : 'none'
                                    }}>
                                        {isCompleted && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '10px',
                                                right: '10px',
                                                background: 'rgba(34, 197, 94, 0.2)',
                                                color: '#4ade80',
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                fontSize: '0.8rem',
                                                fontWeight: 'bold'
                                            }}>
                                                ✓ Done
                                            </div>
                                        )}

                                        <h4 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1.2rem' }}>{quiz.title}</h4>

                                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                                {quiz.difficulty}
                                            </span>
                                            <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                                {quiz.questionCount} Qs
                                            </span>
                                        </div>

                                        {isCompleted && (
                                            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                                Best Score: <span style={{ color: 'var(--text-main)' }}>{result.best_score}</span>
                                            </p>
                                        )}

                                        <button
                                            onClick={() => onStartQuiz(quiz.id)}
                                            style={{ width: '100%', marginBottom: isCompleted ? '0.5rem' : '0' }}
                                        >
                                            {isCompleted ? 'Retake Quiz' : 'Start Quiz'}
                                        </button>

                                        {isCompleted && (
                                            <button
                                                onClick={() => onViewAttempts(quiz.id)}
                                                style={{
                                                    width: '100%',
                                                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))',
                                                    border: '1px solid rgba(99, 102, 241, 0.3)',
                                                    color: '#a5b4fc'
                                                }}
                                            >
                                                📊 View Reports ({result.attempts})
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default QuizSetup;
