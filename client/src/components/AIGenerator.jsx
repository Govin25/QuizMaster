import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import API_URL from '../config';

const AIGenerator = ({ onBack, onCreated }) => {
    const { token } = useAuth();
    const { showSuccess, showError } = useToast();
    const [topic, setTopic] = useState('');
    const [difficulty, setDifficulty] = useState('Beginner');
    const [loading, setLoading] = useState(false);

    const handleGenerate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/quizzes/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ topic, difficulty })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to generate quiz (${response.status})`);
            }

            const data = await response.json();
            showSuccess(`Quiz "${data.title}" generated successfully!`);
            onCreated(); // Go to My Quizzes
        } catch (err) {
            showError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-card" style={{ maxWidth: '600px', width: '100%' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
                gap: '1rem',
                flexWrap: 'wrap'
            }}>
                <h2 style={{ margin: 0 }}>AI Quiz Generator</h2>
                <button onClick={onBack} style={{
                    background: 'rgba(255,255,255,0.1)',
                    padding: '0.6rem 1.2rem'
                }}>
                    ← Back
                </button>
            </div>

            {/* AI Badge */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.2))',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '2rem',
                textAlign: 'center'
            }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🤖</div>
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                    Generate a quiz instantly using AI. Just provide a topic and difficulty level!
                </p>
            </div>

            {/* Form */}
            <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                        Topic
                    </label>
                    <input
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g., Space Exploration, Ancient Rome, Machine Learning"
                        required
                        disabled={loading}
                        style={{ width: '100%' }}
                    />
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Be specific for better results
                    </p>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                        Difficulty Level
                    </label>
                    <select
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                        disabled={loading}
                        style={{ width: '100%' }}
                    >
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                        <option value="Expert">Expert</option>
                    </select>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '1rem',
                        background: loading
                            ? 'rgba(255,255,255,0.1)'
                            : 'linear-gradient(45deg, #ff00cc, #3333ff)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                >
                    {loading ? (
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <span style={{
                                width: '16px',
                                height: '16px',
                                border: '2px solid white',
                                borderTopColor: 'transparent',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite'
                            }} />
                            Generating Quiz...
                        </span>
                    ) : (
                        '✨ Generate Quiz with AI'
                    )}
                </button>
            </form>

            {/* Info Box */}
            <div style={{
                marginTop: '2rem',
                padding: '1rem',
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: '8px',
                fontSize: '0.85rem',
                color: 'var(--text-muted)'
            }}>
                <strong style={{ color: '#a5b4fc' }}>Note:</strong> AI-generated quizzes are created as drafts. You can review and publish them from "My Quizzes".
            </div>

            {/* Add spinner animation */}
            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default AIGenerator;
