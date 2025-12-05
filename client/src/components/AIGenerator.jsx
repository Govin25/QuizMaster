import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import API_URL from '../config';
import './AIGenerator.css';

/**
 * Enhanced AI Quiz Generator with premium UI/UX
 */
const AIGenerator = ({ onBack, onCreated }) => {
    const { fetchWithAuth } = useAuth();
    const { showSuccess, showError } = useToast();

    // Wizard state
    const [step, setStep] = useState(1);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [progress, setProgress] = useState(0);

    // Configuration state
    const [config, setConfig] = useState({
        topic: '',
        numQuestions: 10,
        difficulty: 'Intermediate',
        focusAreas: '',
        keywords: '',
        questionTypes: ['multiple_choice', 'true_false'],
        additionalContext: ''
    });

    // Generated quiz state
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [suggestedCategories, setSuggestedCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [quizTitle, setQuizTitle] = useState('');

    // Generate quiz
    const handleGenerate = async () => {
        if (!config.topic.trim()) {
            showError('Please enter a topic');
            return;
        }
        if (config.questionTypes.length === 0) {
            showError('Please select at least one question type');
            return;
        }

        setIsGenerating(true);
        setProgress(0);
        setStep(2);

        const progressInterval = setInterval(() => {
            setProgress(prev => Math.min(prev + Math.random() * 12, 90));
        }, 600);

        try {
            const response = await fetchWithAuth(`${API_URL}/api/quizzes/generate`, {
                method: 'POST',
                body: JSON.stringify(config)
            });

            clearInterval(progressInterval);
            setProgress(100);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to generate quiz');
            }

            const data = await response.json();
            setQuestions(data.questions || []);
            setQuizTitle(data.title || `${config.topic} Quiz`);
            setSuggestedCategories(data.suggestedCategories || [data.category || config.topic]);
            setSelectedCategory(data.category || config.topic);

            setTimeout(() => {
                setStep(3);
                setIsGenerating(false);
            }, 500);

            showSuccess(`Generated ${data.questions?.length || 0} questions!`);
        } catch (error) {
            clearInterval(progressInterval);
            setIsGenerating(false);
            setStep(1);
            showError(error.message);
        }
    };

    // Update question
    const updateQuestion = (index, field, value) => {
        const updated = [...questions];
        updated[index] = { ...updated[index], [field]: value };
        setQuestions(updated);
    };

    // Update option
    const updateOption = (questionIndex, optionIndex, value) => {
        const updated = [...questions];
        const newOptions = [...updated[questionIndex].options];
        newOptions[optionIndex] = value;
        updated[questionIndex] = { ...updated[questionIndex], options: newOptions };
        setQuestions(updated);
    };

    // Set correct answer
    const setCorrectAnswer = (questionIndex, answer) => {
        const updated = [...questions];
        updated[questionIndex] = { ...updated[questionIndex], correctAnswer: answer };
        setQuestions(updated);
    };

    // Delete question
    const deleteQuestion = (index) => {
        if (questions.length <= 5) {
            showError('Quiz must have at least 5 questions');
            return;
        }
        const updated = questions.filter((_, i) => i !== index);
        setQuestions(updated);
        if (currentQuestionIndex >= updated.length) {
            setCurrentQuestionIndex(Math.max(0, updated.length - 1));
        }
    };

    // Save quiz
    const handleSave = async () => {
        if (questions.length < 5) {
            showError('Quiz must have at least 5 questions');
            return;
        }
        if (!quizTitle.trim()) {
            showError('Please enter a quiz title');
            return;
        }
        if (!selectedCategory.trim()) {
            showError('Please select or enter a category');
            return;
        }

        setIsSaving(true);
        try {
            const response = await fetchWithAuth(`${API_URL}/api/quizzes/save-ai-quiz`, {
                method: 'POST',
                body: JSON.stringify({
                    title: quizTitle.trim(),
                    category: selectedCategory.trim(),
                    difficulty: config.difficulty.toLowerCase(),
                    questions
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to save quiz');
            }

            showSuccess('Quiz saved successfully!');
            onCreated();
        } catch (error) {
            showError(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    // Toggle question type
    const toggleQuestionType = (type) => {
        setConfig(prev => {
            const types = prev.questionTypes.includes(type)
                ? prev.questionTypes.filter(t => t !== type)
                : [...prev.questionTypes, type];
            return { ...prev, questionTypes: types };
        });
    };

    // Step 1: Configuration
    const renderStep1 = () => (
        <div className="ai-gen-step fade-in">
            {/* Topic Input - Hero */}
            <div className="ai-gen-hero-input">
                <div className="ai-gen-input-icon">🎯</div>
                <div className="ai-gen-input-content">
                    <label>What topic do you want a quiz about?</label>
                    <input
                        type="text"
                        value={config.topic}
                        onChange={(e) => setConfig({ ...config, topic: e.target.value })}
                        placeholder="e.g., JavaScript Promises, World War II, Machine Learning..."
                        className="ai-gen-topic-input"
                        autoFocus
                    />
                </div>
            </div>

            {/* Quick Settings Row */}
            <div className="ai-gen-quick-settings">
                {/* Question Count */}
                <div className="ai-gen-setting-card">
                    <div className="ai-gen-setting-header">
                        <span className="ai-gen-setting-icon">📊</span>
                        <span>Questions</span>
                    </div>
                    <div className="ai-gen-slider-container">
                        <input
                            type="range"
                            min="5"
                            max="50"
                            value={config.numQuestions}
                            onChange={(e) => setConfig({ ...config, numQuestions: parseInt(e.target.value) })}
                            className="ai-gen-slider"
                        />
                        <span className="ai-gen-slider-value">{config.numQuestions}</span>
                    </div>
                </div>

                {/* Difficulty */}
                <div className="ai-gen-setting-card">
                    <div className="ai-gen-setting-header">
                        <span className="ai-gen-setting-icon">⚡</span>
                        <span>Difficulty</span>
                    </div>
                    <div className="ai-gen-difficulty-pills">
                        {['Beginner', 'Intermediate', 'Advanced', 'Expert'].map(level => (
                            <button
                                key={level}
                                type="button"
                                onClick={() => setConfig({ ...config, difficulty: level })}
                                className={`ai-gen-pill ${config.difficulty === level ? 'active' : ''}`}
                            >
                                {level === 'Beginner' && '🌱'}
                                {level === 'Intermediate' && '🌿'}
                                {level === 'Advanced' && '🌳'}
                                {level === 'Expert' && '🏆'}
                                <span>{level}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Question Types */}
            <div className="ai-gen-types-row">
                <span className="ai-gen-types-label">Include:</span>
                {[
                    { value: 'multiple_choice', label: 'Multiple Choice', icon: '☑️' },
                    { value: 'true_false', label: 'True/False', icon: '✓✗' }
                ].map(type => (
                    <button
                        key={type.value}
                        type="button"
                        onClick={() => toggleQuestionType(type.value)}
                        className={`ai-gen-type-btn ${config.questionTypes.includes(type.value) ? 'active' : ''}`}
                    >
                        <span className="ai-gen-type-icon">{type.icon}</span>
                        <span>{type.label}</span>
                    </button>
                ))}
            </div>

            {/* Advanced Options (Collapsible) */}
            <details className="ai-gen-advanced">
                <summary className="ai-gen-advanced-toggle">
                    <span>✨ Advanced Options</span>
                    <span className="ai-gen-toggle-arrow">▼</span>
                </summary>
                <div className="ai-gen-advanced-content">
                    <div className="ai-gen-field">
                        <label>
                            <span className="ai-gen-field-icon">🎯</span>
                            Focus Areas
                            <span className="ai-gen-optional">(optional)</span>
                        </label>
                        <textarea
                            value={config.focusAreas}
                            onChange={(e) => setConfig({ ...config, focusAreas: e.target.value })}
                            placeholder="e.g., error handling, async/await, promise chaining"
                            rows={2}
                        />
                        <span className="ai-gen-hint">Topics to prioritize in questions</span>
                    </div>

                    <div className="ai-gen-field">
                        <label>
                            <span className="ai-gen-field-icon">🏷️</span>
                            Keywords
                            <span className="ai-gen-optional">(optional)</span>
                        </label>
                        <input
                            type="text"
                            value={config.keywords}
                            onChange={(e) => setConfig({ ...config, keywords: e.target.value })}
                            placeholder="e.g., then, catch, async, await"
                        />
                        <span className="ai-gen-hint">Terms to include in questions</span>
                    </div>

                    <div className="ai-gen-field">
                        <label>
                            <span className="ai-gen-field-icon">📝</span>
                            Additional Instructions
                            <span className="ai-gen-optional">(optional)</span>
                        </label>
                        <textarea
                            value={config.additionalContext}
                            onChange={(e) => setConfig({ ...config, additionalContext: e.target.value })}
                            placeholder="e.g., Include practical scenarios, focus on ES6+ features..."
                            rows={2}
                        />
                    </div>
                </div>
            </details>

            {/* Generate Button */}
            <button
                onClick={handleGenerate}
                disabled={!config.topic.trim() || config.questionTypes.length === 0}
                className="ai-gen-submit-btn"
            >
                <span className="ai-gen-btn-icon">✨</span>
                <span>Generate {config.numQuestions} Questions</span>
                <span className="ai-gen-btn-arrow">→</span>
            </button>
        </div>
    );

    // Step 2: Generation Progress
    const renderStep2 = () => (
        <div className="ai-gen-step ai-gen-loading fade-in">
            <div className="ai-gen-loading-animation">
                <div className="ai-gen-brain-icon">🧠</div>
                <div className="ai-gen-sparkles">
                    <span>✨</span><span>✨</span><span>✨</span>
                </div>
            </div>

            <h3 className="ai-gen-loading-title">Creating Your Quiz</h3>
            <p className="ai-gen-loading-topic">"{config.topic}"</p>

            <div className="ai-gen-progress-container">
                <div className="ai-gen-progress-bar">
                    <div
                        className="ai-gen-progress-fill"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <span className="ai-gen-progress-text">{Math.round(progress)}%</span>
            </div>

            <div className="ai-gen-loading-status">
                {progress < 25 && '🔍 Analyzing topic...'}
                {progress >= 25 && progress < 50 && '💡 Generating questions...'}
                {progress >= 50 && progress < 75 && '✏️ Creating answer options...'}
                {progress >= 75 && progress < 95 && '🎯 Verifying accuracy...'}
                {progress >= 95 && '✅ Almost ready!'}
            </div>

            <div className="ai-gen-loading-stats">
                <div className="ai-gen-stat">
                    <span className="ai-gen-stat-value">{config.numQuestions}</span>
                    <span className="ai-gen-stat-label">Questions</span>
                </div>
                <div className="ai-gen-stat">
                    <span className="ai-gen-stat-value">{config.difficulty}</span>
                    <span className="ai-gen-stat-label">Difficulty</span>
                </div>
            </div>
        </div>
    );

    // Step 3: Review & Edit Questions
    const renderStep3 = () => {
        const currentQuestion = questions[currentQuestionIndex];
        if (!currentQuestion) return null;

        return (
            <div className="ai-gen-step ai-gen-review fade-in">
                {/* Quiz Meta */}
                <div className="ai-gen-review-meta">
                    <div className="ai-gen-meta-field">
                        <label>Quiz Title</label>
                        <input
                            type="text"
                            value={quizTitle}
                            onChange={(e) => setQuizTitle(e.target.value)}
                            className="ai-gen-meta-input"
                        />
                    </div>
                    <div className="ai-gen-meta-field">
                        <label>Category</label>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="ai-gen-meta-select"
                        >
                            {suggestedCategories.map((cat, i) => (
                                <option key={i} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Question Navigation */}
                <div className="ai-gen-question-nav">
                    <button
                        onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                        disabled={currentQuestionIndex === 0}
                        className="ai-gen-nav-btn"
                    >
                        ←
                    </button>
                    <span className="ai-gen-nav-info">
                        <strong>{currentQuestionIndex + 1}</strong> / {questions.length}
                    </span>
                    <button
                        onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
                        disabled={currentQuestionIndex === questions.length - 1}
                        className="ai-gen-nav-btn"
                    >
                        →
                    </button>
                </div>

                {/* Question Dots */}
                <div className="ai-gen-question-dots">
                    {questions.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentQuestionIndex(idx)}
                            className={`ai-gen-dot ${idx === currentQuestionIndex ? 'active' : ''}`}
                            title={`Question ${idx + 1}`}
                        />
                    ))}
                </div>

                {/* Question Editor Card */}
                <div className="ai-gen-question-card">
                    <div className="ai-gen-question-header">
                        <span className={`ai-gen-question-type ${currentQuestion.type}`}>
                            {currentQuestion.type === 'multiple_choice' ? '☑️ Multiple Choice' : '✓✗ True/False'}
                        </span>
                        <button
                            onClick={() => deleteQuestion(currentQuestionIndex)}
                            disabled={questions.length <= 5}
                            className="ai-gen-delete-btn"
                            title={questions.length <= 5 ? 'Minimum 5 questions required' : 'Delete question'}
                        >
                            🗑️
                        </button>
                    </div>

                    <div className="ai-gen-question-body">
                        <label className="ai-gen-editor-label">Question Text</label>
                        <textarea
                            value={currentQuestion.text}
                            onChange={(e) => updateQuestion(currentQuestionIndex, 'text', e.target.value)}
                            className="ai-gen-question-textarea"
                            rows={3}
                        />

                        {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
                            <div className="ai-gen-options">
                                <label className="ai-gen-editor-label">Options (click to mark correct)</label>
                                {currentQuestion.options.map((option, optIdx) => (
                                    <div key={optIdx} className="ai-gen-option-row">
                                        <button
                                            type="button"
                                            onClick={() => setCorrectAnswer(currentQuestionIndex, option)}
                                            className={`ai-gen-option-check ${currentQuestion.correctAnswer === option ? 'correct' : ''}`}
                                        >
                                            {currentQuestion.correctAnswer === option ? '✓' : ''}
                                        </button>
                                        <input
                                            type="text"
                                            value={option}
                                            onChange={(e) => {
                                                const oldValue = option;
                                                updateOption(currentQuestionIndex, optIdx, e.target.value);
                                                if (currentQuestion.correctAnswer === oldValue) {
                                                    setCorrectAnswer(currentQuestionIndex, e.target.value);
                                                }
                                            }}
                                            className={`ai-gen-option-input ${currentQuestion.correctAnswer === option ? 'correct' : ''}`}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        {currentQuestion.type === 'true_false' && (
                            <div className="ai-gen-tf-options">
                                <label className="ai-gen-editor-label">Correct Answer</label>
                                <div className="ai-gen-tf-buttons">
                                    {['true', 'false'].map(val => (
                                        <button
                                            key={val}
                                            type="button"
                                            onClick={() => setCorrectAnswer(currentQuestionIndex, val)}
                                            className={`ai-gen-tf-btn ${currentQuestion.correctAnswer === val ? 'active' : ''}`}
                                        >
                                            {val === 'true' ? '✓ True' : '✗ False'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="ai-gen-actions">
                    <button onClick={() => setStep(1)} className="ai-gen-back-btn">
                        ← Back
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || questions.length < 5}
                        className="ai-gen-save-btn"
                    >
                        {isSaving ? (
                            <>⏳ Saving...</>
                        ) : (
                            <>💾 Save Quiz ({questions.length} questions)</>
                        )}
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="ai-gen-modal">
            <div className="ai-gen-container">
                {/* Header */}
                <div className="ai-gen-header">
                    <div className="ai-gen-title-group">
                        <div className="ai-gen-logo">🤖</div>
                        <div>
                            <h2 className="ai-gen-title">AI Quiz Generator</h2>
                            <p className="ai-gen-subtitle">
                                {step === 1 && 'Configure your quiz settings'}
                                {step === 2 && 'Generating your quiz...'}
                                {step === 3 && 'Review and edit questions'}
                            </p>
                        </div>
                    </div>
                    {step !== 2 && (
                        <button onClick={onBack} className="ai-gen-close-btn">
                            ✕
                        </button>
                    )}
                </div>

                {/* Progress Steps */}
                <div className="ai-gen-steps-indicator">
                    {[
                        { num: 1, label: 'Configure' },
                        { num: 2, label: 'Generate' },
                        { num: 3, label: 'Review' }
                    ].map(s => (
                        <div key={s.num} className={`ai-gen-step-item ${step >= s.num ? 'active' : ''} ${step === s.num ? 'current' : ''}`}>
                            <div className="ai-gen-step-number">{step > s.num ? '✓' : s.num}</div>
                            <span className="ai-gen-step-label">{s.label}</span>
                        </div>
                    ))}
                </div>

                {/* Step Content */}
                <div className="ai-gen-content">
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                </div>
            </div>
        </div>
    );
};

export default AIGenerator;
