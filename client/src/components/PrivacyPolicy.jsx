import React, { useState, useEffect } from 'react';
import API_URL from '../config';

const PrivacyPolicy = ({ onClose }) => {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPrivacyPolicy();
    }, []);

    const fetchPrivacyPolicy = async () => {
        try {
            const response = await fetch(`${API_URL}/api/legal/privacy-policy`);
            const data = await response.json();
            setContent(data.content);
        } catch (error) {
            console.error('Error fetching privacy policy:', error);
            setContent('Failed to load privacy policy. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const containerStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
        overflowY: 'auto'
    };

    const contentStyle = {
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(99, 102, 241, 0.2)',
        borderRadius: '16px',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '2rem',
        position: 'relative'
    };

    const headerStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
    };

    const closeButtonStyle = {
        background: 'rgba(239, 68, 68, 0.2)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        color: '#fca5a5',
        padding: '0.5rem 1rem',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '0.9rem',
        fontWeight: '600',
        transition: 'all 0.2s'
    };

    const markdownStyle = {
        color: 'var(--text-primary)',
        lineHeight: '1.8',
        fontSize: '0.95rem'
    };

    // Simple markdown to HTML converter
    const renderMarkdown = (text) => {
        let isFirstH1 = true; // Skip first H1 since we have it in the header
        return text
            .split('\n')
            .map((line, index) => {
                // Headers
                if (line.startsWith('# ')) {
                    // Skip the first H1 to avoid duplicate title
                    if (isFirstH1) {
                        isFirstH1 = false;
                        return null;
                    }
                    return <h1 key={index} style={{ fontSize: '2rem', marginTop: '2rem', marginBottom: '1rem', background: 'linear-gradient(to right, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{line.substring(2)}</h1>;
                }
                if (line.startsWith('## ')) {
                    return <h2 key={index} style={{ fontSize: '1.5rem', marginTop: '1.5rem', marginBottom: '0.75rem', color: '#818cf8' }}>{line.substring(3)}</h2>;
                }
                if (line.startsWith('### ')) {
                    return <h3 key={index} style={{ fontSize: '1.2rem', marginTop: '1rem', marginBottom: '0.5rem', color: '#a5b4fc' }}>{line.substring(4)}</h3>;
                }
                // Bold
                if (line.startsWith('**') && line.endsWith('**')) {
                    return <p key={index} style={{ fontWeight: '600', marginBottom: '0.5rem' }}>{line.substring(2, line.length - 2)}</p>;
                }
                // List items
                if (line.startsWith('- ')) {
                    return <li key={index} style={{ marginLeft: '1.5rem', marginBottom: '0.25rem' }}>{line.substring(2)}</li>;
                }
                // Empty line
                if (line.trim() === '') {
                    return <br key={index} />;
                }
                // Regular paragraph
                return <p key={index} style={{ marginBottom: '0.75rem' }}>{line}</p>;
            })
            .filter(Boolean); // Remove null entries
    };

    return (
        <div style={containerStyle} onClick={onClose}>
            <div style={contentStyle} onClick={(e) => e.stopPropagation()}>
                <div style={headerStyle}>
                    <h2 style={{
                        margin: 0,
                        background: 'linear-gradient(to right, #818cf8, #c084fc)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        fontSize: '1.75rem'
                    }}>
                        Privacy Policy
                    </h2>
                    <button
                        style={closeButtonStyle}
                        onClick={onClose}
                        onMouseEnter={(e) => {
                            e.target.style.background = 'rgba(239, 68, 68, 0.3)';
                            e.target.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = 'rgba(239, 68, 68, 0.2)';
                            e.target.style.transform = 'translateY(0)';
                        }}
                    >
                        Close
                    </button>
                </div>
                <div style={markdownStyle}>
                    {loading ? (
                        <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</p>
                    ) : (
                        renderMarkdown(content)
                    )}
                </div>
                {/* Close button at bottom */}
                <div style={{
                    marginTop: '2rem',
                    paddingTop: '1.5rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    justifyContent: 'center'
                }}>
                    <button
                        style={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            border: 'none',
                            color: 'white',
                            padding: '0.75rem 2rem',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: '600',
                            transition: 'all 0.2s'
                        }}
                        onClick={onClose}
                        onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
