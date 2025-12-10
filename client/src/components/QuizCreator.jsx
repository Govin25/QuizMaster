import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import API_URL from '../config';
import { handleConcurrencyError } from '../utils/concurrencyHandler';

const QuizCreator = ({ onBack, onCreated, editQuizId = null }) => {
    const { fetchWithAuth } = useAuth();
    const { showSuccess, showError } = useToast();
    const [step, setStep] = useState(1); // 1: Details, 2: Questions
    const [quizData, setQuizData] = useState({
        title: '',
        category: '',
        difficulty: 'easy'
    });
    const [createdQuizId, setCreatedQuizId] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState({
        type: 'multiple_choice',
        text: '',
        options: ['', '', '', ''],
        correctAnswer: ''
    });
    const [questionCount, setQuestionCount] = useState(0);
    const [existingQuestions, setExistingQuestions] = useState([]);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [loading, setLoading] = useState(!!editQuizId);
    const [validationErrors, setValidationErrors] = useState({});
    const [quizVersion, setQuizVersion] = useState(null);

    // Load quiz data if editing
    useEffect(() => {
        if (editQuizId) {
            fetchQuizData();
        }
    }, [editQuizId]);

    const fetchQuizData = async () => {
        const idToFetch = editQuizId || createdQuizId;
        if (!idToFetch) return;

        try {
            const response = await fetchWithAuth(`${API_URL}/api/quizzes/${idToFetch}`);
            if (!response.ok) throw new Error('Failed to fetch quiz');
            const data = await response.json();

            setQuizData({
                title: data.title,
                category: data.category,
                difficulty: data.difficulty
            });
            if (!createdQuizId) setCreatedQuizId(data.id);
            setExistingQuestions(data.questions || []);
            setQuizVersion(data.version); // Store version
            setExistingQuestions(data.questions || []);
            setQuizVersion(data.version); // Store version
            const count = data.questions?.length || 0;
            setQuestionCount(count); // Update question count
            setStep(2); // Go directly to adding questions
            setLoading(false);
        } catch (err) {
            showError(err.message);
            setLoading(false);
        }
    };

    const handleCreateQuiz = async (e) => {
        e.preventDefault();
        setValidationErrors({}); // Clear previous errors
        try {
            const response = await fetchWithAuth(`${API_URL}/api/quizzes`, {
                method: 'POST',
                body: JSON.stringify(quizData)
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));

                // Handle validation errors
                if (errorData.details && Array.isArray(errorData.details)) {
                    const errors = {};
                    errorData.details.forEach(err => {
                        errors[err.field] = err.message;
                    });
                    setValidationErrors(errors);
                    showError('Please fix the validation errors below');
                    return;
                }

                throw new Error(errorData.error || `Failed to create quiz (${response.status})`);
            }
            const data = await response.json();
            setCreatedQuizId(data.id);
            setQuizVersion(data.version || 1); // Initialize version
            setStep(2);
            showSuccess('Quiz created! Now add some questions.');
        } catch (err) {
            showError(err.message);
        }
    };

    const handleAddQuestion = async (e) => {
        e.preventDefault();
        setValidationErrors({}); // Clear previous errors
        try {
            const questionPayload = {
                type: currentQuestion.type,
                text: currentQuestion.text,
                correctAnswer: currentQuestion.correctAnswer,
                options: currentQuestion.type === 'multiple_choice' ? currentQuestion.options : null,
                version: quizVersion // Include version for optimistic locking
            };

            const response = await fetchWithAuth(`${API_URL}/api/quizzes/${createdQuizId}/questions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(questionPayload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));

                // Handle concurrency error
                if (await handleConcurrencyError(errorData, 'quiz', fetchQuizData, showSuccess)) {
                    return;
                }

                // Handle validation errors
                if (errorData.details && Array.isArray(errorData.details)) {
                    const errors = {};
                    errorData.details.forEach(err => {
                        errors[err.field] = err.message;
                    });
                    setValidationErrors(errors);
                    showError('Please fix the validation errors below');
                    return;
                }

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

            // Always refresh to get new version
            await fetchQuizData();

            showSuccess('Question added successfully!');
        } catch (err) {
            showError(err.message);
        }
    };

    const handleUpdateQuestion = async (questionId, questionData) => {
        try {
            const response = await fetchWithAuth(`${API_URL}/api/quizzes/questions/${questionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...questionData, version: quizVersion }) // Include version
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));

                // Handle concurrency error
                if (await handleConcurrencyError(errorData, 'quiz', fetchQuizData, showSuccess)) {
                    return;
                }

                throw new Error(errorData.error || 'Failed to update question');
            }

            await fetchQuizData();
            showSuccess('Question updated successfully!');
        } catch (err) {
            showError(err.message);
        }
    };

    const handleDeleteQuestion = async (questionId) => {
        if (questionCount <= 1) {
            showError('Cannot delete the last question. Quiz must have at least 1 question.');
            return;
        }

        if (!confirm('Are you sure you want to delete this question?')) {
            return;
        }

        try {
            const response = await fetchWithAuth(`${API_URL}/api/quizzes/questions/${questionId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ version: quizVersion }) // Include version
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));

                // Handle concurrency error
                if (await handleConcurrencyError(errorData, 'quiz', fetchQuizData, showSuccess)) {
                    return;
                }

                throw new Error(errorData.error || 'Failed to delete question');
            }

            setQuestionCount(prev => prev - 1);
            // Adjust slide index if needed
            if (currentSlideIndex >= existingQuestions.length - 1 && currentSlideIndex > 0) {
                setCurrentSlideIndex(prev => prev - 1);
            }
            await fetchQuizData();
            showSuccess('Question deleted successfully!');
        } catch (err) {
            showError(err.message);
        }
    };

    const handleOptionChange = (index, value) => {
        // Limit option length to 200 characters
        const trimmedValue = value.slice(0, 200);
        const newOptions = [...currentQuestion.options];
        newOptions[index] = trimmedValue;
        setCurrentQuestion({ ...currentQuestion, options: newOptions });
    };

    if (loading) {
        return (
            <div className="glass-card" style={{ maxWidth: '800px', width: '100%' }}>
                <h2>Loading quiz...</h2>
                <div className="skeleton" style={{ height: '200px' }} />
            </div>
        );
    }

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
                        {editQuizId ? 'Edit Quiz' : (step === 1 ? 'Create New Quiz' : 'Add Questions')}
                    </h2>
                    {step === 2 && (
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            Quiz: {quizData.title} • {questionCount} questions {editQuizId && '(editing)'}
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
                            onChange={e => {
                                setQuizData({ ...quizData, title: e.target.value });
                                if (validationErrors.title) {
                                    setValidationErrors(prev => ({ ...prev, title: null }));
                                }
                            }}
                            placeholder="e.g., JavaScript Fundamentals"
                            required
                            style={{
                                width: '100%',
                                borderColor: validationErrors.title ? '#ef4444' : undefined
                            }}
                        />
                        {validationErrors.title && (
                            <div style={{
                                color: '#ef4444',
                                fontSize: '0.85rem',
                                marginTop: '0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                <span>⚠️</span>
                                <span>{validationErrors.title}</span>
                            </div>
                        )}
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Category</label>
                        <input
                            type="text"
                            value={quizData.category}
                            onChange={e => {
                                setQuizData({ ...quizData, category: e.target.value });
                                if (validationErrors.category) {
                                    setValidationErrors(prev => ({ ...prev, category: null }));
                                }
                            }}
                            placeholder="e.g., Programming, Science, History"
                            required
                            style={{
                                width: '100%',
                                borderColor: validationErrors.category ? '#ef4444' : undefined
                            }}
                        />
                        {validationErrors.category && (
                            <div style={{
                                color: '#ef4444',
                                fontSize: '0.85rem',
                                marginTop: '0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                <span>⚠️</span>
                                <span>{validationErrors.category}</span>
                            </div>
                        )}
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Difficulty</label>
                        <select
                            value={quizData.difficulty}
                            onChange={e => {
                                setQuizData({ ...quizData, difficulty: e.target.value });
                                if (validationErrors.difficulty) {
                                    setValidationErrors(prev => ({ ...prev, difficulty: null }));
                                }
                            }}
                            style={{
                                width: '100%',
                                borderColor: validationErrors.difficulty ? '#ef4444' : undefined
                            }}
                        >
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                        </select>
                        {validationErrors.difficulty && (
                            <div style={{
                                color: '#ef4444',
                                fontSize: '0.85rem',
                                marginTop: '0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                <span>⚠️</span>
                                <span>{validationErrors.difficulty}</span>
                            </div>
                        )}
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
                                onChange={e => {
                                    setCurrentQuestion({ ...currentQuestion, text: e.target.value });
                                    if (validationErrors.text) {
                                        setValidationErrors(prev => ({ ...prev, text: null }));
                                    }
                                }}
                                placeholder="Enter your question..."
                                required
                                style={{
                                    width: '100%',
                                    borderColor: validationErrors.text ? '#ef4444' : undefined
                                }}
                            />
                            {validationErrors.text && (
                                <div style={{
                                    color: '#ef4444',
                                    fontSize: '0.85rem',
                                    marginTop: '0.5rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}>
                                    <span>⚠️</span>
                                    <span>{validationErrors.text}</span>
                                </div>
                            )}
                        </div>

                        {currentQuestion.type === 'multiple_choice' && (
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Options</label>
                                {currentQuestion.options.map((opt, idx) => (
                                    <div key={idx} style={{ marginBottom: '0.75rem' }}>
                                        <input
                                            type="text"
                                            placeholder={`Option ${idx + 1}`}
                                            value={opt}
                                            onChange={e => handleOptionChange(idx, e.target.value)}
                                            required
                                            style={{
                                                width: '100%',
                                                marginBottom: '0.25rem',
                                                borderColor: opt.length > 150 ? '#fb923c' : undefined
                                            }}
                                        />
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            fontSize: '0.75rem',
                                            color: opt.length > 150 ? '#fb923c' : 'var(--text-muted)',
                                            marginBottom: '0.5rem'
                                        }}>
                                            <span>{opt.length > 150 && '⚠️ Keep options concise for better readability'}</span>
                                            <span>{opt.length}/200</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Correct Answer</label>
                            {currentQuestion.type === 'true_false' ? (
                                <select
                                    value={currentQuestion.correctAnswer}
                                    onChange={e => {
                                        setCurrentQuestion({ ...currentQuestion, correctAnswer: e.target.value });
                                        if (validationErrors.correctAnswer) {
                                            setValidationErrors(prev => ({ ...prev, correctAnswer: null }));
                                        }
                                    }}
                                    required
                                    style={{
                                        width: '100%',
                                        borderColor: validationErrors.correctAnswer ? '#ef4444' : undefined
                                    }}
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
                                    onChange={e => {
                                        setCurrentQuestion({ ...currentQuestion, correctAnswer: e.target.value });
                                        if (validationErrors.correctAnswer) {
                                            setValidationErrors(prev => ({ ...prev, correctAnswer: null }));
                                        }
                                    }}
                                    required
                                    style={{
                                        width: '100%',
                                        borderColor: validationErrors.correctAnswer ? '#ef4444' : undefined
                                    }}
                                />
                            )}
                            {validationErrors.correctAnswer && (
                                <div style={{
                                    color: '#ef4444',
                                    fontSize: '0.85rem',
                                    marginTop: '0.5rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}>
                                    <span>⚠️</span>
                                    <span>{validationErrors.correctAnswer}</span>
                                </div>
                            )}
                        </div>

                        <button type="submit" style={{ width: '100%' }}>
                            + Add Question
                        </button>
                    </form>

                    <button
                        onClick={() => {
                            if (questionCount < 5) {
                                showError('Please add at least 5 questions before finishing');
                                return;
                            }
                            onCreated();
                        }}
                        disabled={questionCount < 5}
                        style={{
                            width: '100%',
                            padding: '1rem',
                            background: questionCount >= 5
                                ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(16, 185, 129, 0.3))'
                                : 'rgba(148, 163, 184, 0.2)',
                            border: questionCount >= 5
                                ? '2px solid rgba(34, 197, 94, 0.5)'
                                : '2px solid rgba(148, 163, 184, 0.3)',
                            color: questionCount >= 5 ? '#22c55e' : '#94a3b8',
                            cursor: questionCount >= 5 ? 'pointer' : 'not-allowed',
                            opacity: questionCount >= 5 ? 1 : 0.6
                        }}
                    >
                        ✓ Finish & View My Quizzes {questionCount < 5 && `(${questionCount}/5 questions)`}
                    </button>
                </div>
            )}
        </div>
    );
};

export default QuizCreator;
