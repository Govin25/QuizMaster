import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import API_URL from '../config';

const AuthForm = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';

        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Authentication failed');
            }

            login(data.user, data.token);
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="glass-card" style={{ maxWidth: '400px', width: '100%' }}>
            <h2>{isLogin ? 'Welcome Back' : 'Join QuizMaster'}</h2>
            {error && <div style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</div>}
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <button type="submit" style={{ width: '100%' }}>
                    {isLogin ? 'Login' : 'Sign Up'}
                </button>
            </form>
            <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <span
                    style={{ color: 'var(--primary)', cursor: 'pointer' }}
                    onClick={() => setIsLogin(!isLogin)}
                >
                    {isLogin ? 'Sign Up' : 'Login'}
                </span>
            </p>
        </div>
    );
};

export default AuthForm;
