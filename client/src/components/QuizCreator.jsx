import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import API_URL from '../config';

const QuizCreator = ({ onBack, onCreated }) => {
    const { token } = useAuth();
    const { showSuccess, showError } = useToast();
    const [step, setStep] = useState(1); // 1: Details, 2: Questions
    const [quizData, setQuizData] = useState({
        title: '',
        category: '',
        difficulty: 'Beginner'
    });
    const [createdQuizId, setCreatedQuizId] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState({
        type: 'multiple_choice',
        text: '',
        options: ['', '', '', ''],
        correctAnswer: ''
    });
    const [questionCount, setQuestionCount] = useState(0);

    const handleCreateQuiz = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_URL}/api/quizzes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(quizData)
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to create quiz (${response.status})`);
            }
            const data = await response.json();
            setCreatedQuizId(data.id);
            setStep(2);
            showSuccess('Quiz created! Now add some questions.');
        } catch (err) {
            showError(err.message);
        }
    };

    const handleAddQuestion = async (e) => {
        e.preventDefault();
        try {
            const questionPayload = {
                type: currentQuestion.type,
                text: currentQuestion.text,
                correctAnswer: currentQuestion.correctAnswer,
                options: currentQuestion.type === 'multiple_choice' ? currentQuestion.options : null
            };

            const response = await fetch(`${API_URL}/api/quizzes/${createdQuizId}/questions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(questionPayload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to add question (${response.status})`);
            }

            // Reset question form
            setCurrentQuestion({
                type: 'multiple_choice',
                text: '',
                options: ['', '', '', ''],
                correctAnswer: ''
            });
            setQuestionCount(prev => prev + 1);
            showSuccess('Question added successfully!');
        } catch (err) {
            showError(err.message);
        }
    };

    const handleOptionChange = (index, value) => {
        const newOptions = [...currentQuestion.options];
        newOptions[index] = value;
        setCurrentQuestion({ ...currentQuestion, options: newOptions });
    };

    return (
        <div className="glass-card" style={{ maxWidth: '800px', width: '100%' }}>
            {/* Header with Progress */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
                gap: '1rem',
                flexWrap: 'wrap'
            }}>
                <div>
                    <h2 style={{ margin: 0, marginBottom: '0.5rem' }}>
                        {step === 1 ? 'Create New Quiz' : `Add Questions`}
                    </h2>
                    {step === 2 && (
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            Quiz: {quizData.title} • {questionCount} questions added
                        </p>
                    )}
                </div>
                <button onClick={onBack} style={{
                    background: 'rgba(255,255,255,0.1)',
                    padding: '0.6rem 1.2rem'
                }}>
                    ← Back
                </button>
            </div>

            {/* Step Indicator */}
            <div style={{
                display: 'flex',
                gap: '1rem',
                marginBottom: '2rem',
                alignItems: 'center'
            }}>
                <div style={{
                    flex: 1,
                    height: '4px',
                    background: step >= 1 ? 'linear-gradient(135deg, var(--primary), var(--secondary))' : 'rgba(255,255,255,0.1)',
                    borderRadius: '2px',
                    position: 'relative'
                }}>
                    <div style={{
                        position: 'absolute',
                        top: '-10px',
                        left: '0',
                        transform: 'translateX(-50%)',
                        background: step >= 1 ? 'var(--primary)' : 'rgba(255,255,255,0.2)',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        border: '2px solid var(--bg-color)'
                    }}>
                        1
                    </div>
                </div>
                <div style={{
                    flex: 1,
                    height: '4px',
                    background: step >= 2 ? 'linear-gradient(135deg, var(--primary), var(--secondary))' : 'rgba(255,255,255,0.1)',
                    borderRadius: '2px',
                    position: 'relative'
                }}>
                    <div style={{
                        position: 'absolute',
                        top: '-10px',
                        right: '0',
                        transform: 'translateX(50%)',
                        background: step >= 2 ? 'var(--primary)' : 'rgba(255,255,255,0.2)',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        border: '2px solid var(--bg-color)'
                    }}>
                        2
                    </div>
                </div>
            </div>

            {/* Step 1: Quiz Details */}
            {step === 1 && (
                <form onSubmit={handleCreateQuiz} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Quiz Title</label>
                        <input
                            type="text"
                            value={quizData.title}
                            onChange={e => setQuizData({ ...quizData, title: e.target.value })}
                            placeholder="e.g., JavaScript Fundamentals"
                            required
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Category</label>
                        <input
                            type="text"
                            value={quizData.category}
                            onChange={e => setQuizData({ ...quizData, category: e.target.value })}
                            placeholder="e.g., Programming, Science, History"
                            required
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Difficulty</label>
                        <select
                            value={quizData.difficulty}
                            onChange={e => setQuizData({ ...quizData, difficulty: e.target.value })}
                            style={{ width: '100%' }}
                        >
                            <option value="Beginner">Beginner</option>
                            <option value="Intermediate">Intermediate</option>
                            <option value="Advanced">Advanced</option>
                            <option value="Expert">Expert</option>
                        </select>
                    </div>
                    <button type="submit" style={{ width: '100%', padding: '1rem' }}>
                        Continue to Add Questions →
                    </button>
                </form>
            )}

            {/* Step 2: Add Questions */}
            {step === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <form onSubmit={handleAddQuestion} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.5rem',
                        background: 'rgba(255,255,255,0.03)',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        border: '1px solid var(--glass-border)'
                    }}>
                        <h3 style={{ margin: 0 }}>Add a Question</h3>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Question Type</label>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <label style={{
                                    flex: 1,
                                    padding: '1rem',
                                    background: currentQuestion.type === 'multiple_choice' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                                    border: `2px solid ${currentQuestion.type === 'multiple_choice' ? 'var(--primary)' : 'var(--glass-border)'}`,
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    textAlign: 'center',
                                    transition: 'all 0.2s'
                                }}>
                                    <input
                                        type="radio"
                                        name="questionType"
                                        value="multiple_choice"
                                        checked={currentQuestion.type === 'multiple_choice'}
                                        onChange={e => setCurrentQuestion({ ...currentQuestion, type: e.target.value, correctAnswer: '' })}
                                        style={{ display: 'none' }}
                                    />
                                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📝</div>
                                    <div>Multiple Choice</div>
                                </label>
                                <label style={{
                                    flex: 1,
                                    padding: '1rem',
                                    background: currentQuestion.type === 'true_false' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                                    border: `2px solid ${currentQuestion.type === 'true_false' ? 'var(--primary)' : 'var(--glass-border)'}`,
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    textAlign: 'center',
                                    transition: 'all 0.2s'
                                }}>
                                    <input
                                        type="radio"
                                        name="questionType"
                                        value="true_false"
                                        checked={currentQuestion.type === 'true_false'}
                                        onChange={e => setCurrentQuestion({ ...currentQuestion, type: e.target.value, correctAnswer: '' })}
                                        style={{ display: 'none' }}
                                    />
                                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>✓✕</div>
                                    <div>True/False</div>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Question Text</label>
                            <input
                                type="text"
                                value={currentQuestion.text}
                                onChange={e => setCurrentQuestion({ ...currentQuestion, text: e.target.value })}
                                placeholder="Enter your question..."
                                required
                                style={{ width: '100%' }}
                            />
                        </div>

                        {currentQuestion.type === 'multiple_choice' && (
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Options</label>
                                {currentQuestion.options.map((opt, idx) => (
                                    <input
                                        key={idx}
                                        type="text"
                                        placeholder={`Option ${idx + 1}`}
                                        value={opt}
                                        onChange={e => handleOptionChange(idx, e.target.value)}
                                        required
                                        style={{ width: '100%', marginBottom: '0.75rem' }}
                                    />
                                ))}
                            </div>
                        )}

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Correct Answer</label>
                            {currentQuestion.type === 'true_false' ? (
                                <select
                                    value={currentQuestion.correctAnswer}
                                    onChange={e => setCurrentQuestion({ ...currentQuestion, correctAnswer: e.target.value })}
                                    required
                                    style={{ width: '100%' }}
                                >
                                    <option value="">Select Answer</option>
                                    <option value="true">True</option>
                                    <option value="false">False</option>
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    placeholder="Enter the correct option text exactly"
                                    value={currentQuestion.correctAnswer}
                                    onChange={e => setCurrentQuestion({ ...currentQuestion, correctAnswer: e.target.value })}
                                    required
                                    style={{ width: '100%' }}
                                />
                            )}
                        </div>

                        <button type="submit" style={{ width: '100%' }}>
                            + Add Question
                        </button>
                    </form>

                    <button
                        onClick={onCreated}
                        style={{
                            width: '100%',
                            padding: '1rem',
                            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(16, 185, 129, 0.3))',
                            border: '2px solid rgba(34, 197, 94, 0.5)'
                        }}
                    >
                        ✓ Finish & View My Quizzes
                    </button>
                </div>
            )}
        </div>
    );
};

export default QuizCreator;
