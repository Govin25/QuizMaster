import React, { useState } from 'react';
import AIGenerator from './AIGenerator';
import DocumentQuizGenerator from './DocumentQuizGenerator';
import VideoQuizGenerator from './VideoQuizGenerator';

const QuizCreationHub = ({ onBack, onCreated, onManualCreate }) => {
    const [activeGenerator, setActiveGenerator] = useState(null);

    const creationOptions = [
        {
            id: 'ai',
            icon: '🤖',
            title: 'AI Generate',
            subtitle: 'From Topic',
            description: 'Enter a topic and let AI create quiz questions automatically',
            gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            glow: 'rgba(99, 102, 241, 0.3)'
        },
        {
            id: 'video',
            icon: '🎥',
            title: 'From Video',
            subtitle: 'YouTube Link',
            description: 'Paste a YouTube URL to generate questions from video content',
            gradient: 'linear-gradient(135deg, #ec4899, #f43f5e)',
            glow: 'rgba(236, 72, 153, 0.3)'
        },
        {
            id: 'document',
            icon: '📄',
            title: 'From Document',
            subtitle: 'PDF or Text',
            description: 'Upload a document or paste text to create quiz questions',
            gradient: 'linear-gradient(135deg, #a855f7, #c084fc)',
            glow: 'rgba(168, 85, 247, 0.3)'
        },
        {
            id: 'manual',
            icon: '✍️',
            title: 'Manual Create',
            subtitle: 'Step by Step',
            description: 'Build your quiz from scratch with full control over every question',
            gradient: 'linear-gradient(135deg, #14b8a6, #22d3d1)',
            glow: 'rgba(20, 184, 166, 0.3)'
        }
    ];

    const handleOptionClick = (optionId) => {
        if (optionId === 'manual') {
            onManualCreate();
        } else {
            setActiveGenerator(optionId);
        }
    };

    const handleGeneratorComplete = () => {
        setActiveGenerator(null);
        onCreated();
    };

    const handleGeneratorClose = () => {
        setActiveGenerator(null);
    };

    // Render active generator
    if (activeGenerator === 'ai') {
        return (
            <AIGenerator
                onBack={handleGeneratorClose}
                onCreated={handleGeneratorComplete}
            />
        );
    }

    if (activeGenerator === 'video') {
        return (
            <VideoQuizGenerator
                onClose={handleGeneratorClose}
                onQuizCreated={handleGeneratorComplete}
            />
        );
    }

    if (activeGenerator === 'document') {
        return (
            <DocumentQuizGenerator
                onClose={handleGeneratorClose}
                onQuizCreated={handleGeneratorComplete}
            />
        );
    }

    // Render hub
    return (
        <div className="glass-card" style={{ maxWidth: '900px', width: '100%' }}>
            {/* Header */}
            <div style={{
                textAlign: 'center',
                marginBottom: '2.5rem'
            }}>
                <div style={{
                    fontSize: '3rem',
                    marginBottom: '0.5rem',
                    filter: 'drop-shadow(0 0 10px rgba(99, 102, 241, 0.5))'
                }}>
                    ✨
                </div>
                <h2 style={{
                    margin: '0 0 0.5rem 0',
                    fontSize: '1.8rem',
                    background: 'linear-gradient(to right, #818cf8, #c084fc, #f472b6)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>
                    Create a New Quiz
                </h2>
                <p style={{
                    color: 'var(--text-muted)',
                    margin: 0,
                    fontSize: '1rem'
                }}>
                    Choose how you'd like to create your quiz
                </p>
            </div>

            {/* Creation Options Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1.25rem',
                marginBottom: '2rem'
            }}>
                {creationOptions.map(option => (
                    <div
                        key={option.id}
                        onClick={() => handleOptionClick(option.id)}
                        style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '16px',
                            padding: '1.5rem',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.boxShadow = `0 12px 40px ${option.glow}`;
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                        }}
                    >
                        {/* Icon Circle */}
                        <div style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '50%',
                            background: option.gradient,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.8rem',
                            marginBottom: '1rem',
                            boxShadow: `0 4px 20px ${option.glow}`
                        }}>
                            {option.icon}
                        </div>

                        {/* Title & Subtitle */}
                        <h3 style={{
                            margin: '0 0 0.25rem 0',
                            fontSize: '1.1rem',
                            color: 'white',
                            fontWeight: '600'
                        }}>
                            {option.title}
                        </h3>
                        <div style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            marginBottom: '0.75rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}>
                            {option.subtitle}
                        </div>

                        {/* Description */}
                        <p style={{
                            margin: 0,
                            fontSize: '0.85rem',
                            color: 'rgba(255, 255, 255, 0.6)',
                            lineHeight: '1.4'
                        }}>
                            {option.description}
                        </p>

                        {/* Arrow indicator */}
                        <div style={{
                            position: 'absolute',
                            bottom: '1rem',
                            right: '1rem',
                            opacity: 0.4,
                            transition: 'opacity 0.2s'
                        }}>
                            →
                        </div>
                    </div>
                ))}
            </div>

            {/* Back Button */}
            <div style={{ textAlign: 'center' }}>
                <button
                    onClick={onBack}
                    style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        padding: '0.75rem 2rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                    }}
                >
                    ← Back to Home
                </button>
            </div>
        </div>
    );
};

export default QuizCreationHub;
