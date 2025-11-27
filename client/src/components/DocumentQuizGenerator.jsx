import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import API_URL from '../config';

const DocumentQuizGenerator = ({ onClose, onQuizCreated }) => {
    const { token } = useAuth();
    const { showSuccess, showError, showInfo } = useToast();
    const [step, setStep] = useState(1);
    const [file, setFile] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const [config, setConfig] = useState({
        numQuestions: 10,
        difficulty: 'medium',
        questionTypes: ['multiple_choice', 'true_false'],
        category: '',
        focusArea: '',
        keywords: ''
    });
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [generatedQuiz, setGeneratedQuiz] = useState(null);
    const [editingQuestions, setEditingQuestions] = useState([]);

    // File upload handlers
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleFileSelect = (selectedFile) => {
        // Validate file type
        const allowedTypes = ['application/pdf', 'text/plain'];
        if (!allowedTypes.includes(selectedFile.type)) {
            showError('Please upload a PDF or TXT file');
            return;
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024;
        if (selectedFile.size > maxSize) {
            showError('File size must be less than 10MB');
            return;
        }

        setFile(selectedFile);
        showSuccess('File uploaded successfully!');
    };

    const handleFileInput = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
        }
    };

    const removeFile = () => {
        setFile(null);
    };

    // Quiz generation
    const generateQuiz = async () => {
        if (!file) {
            showError('Please upload a document first');
            return;
        }

        if (!config.category.trim()) {
            showError('Please enter a category/topic');
            return;
        }

        setProcessing(true);
        setProgress(0);
        setStep(3);

        const formData = new FormData();
        formData.append('document', file);
        formData.append('config', JSON.stringify(config));

        // Simulate progress
        const progressInterval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 90) {
                    clearInterval(progressInterval);
                    return 90;
                }
                return prev + 10;
            });
        }, 500);

        try {
            const response = await fetch(`${API_URL}/api/quizzes/generate-from-document`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            clearInterval(progressInterval);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to generate quiz');
            }

            const data = await response.json();
            setProgress(100);
            setGeneratedQuiz(data);

            // Ensure all questions have their correct answers pre-selected
            const questionsWithAnswers = (data.questions || []).map(q => ({
                ...q,
                correctAnswer: q.correctAnswer || (q.type === 'true_false' ? 'true' : (q.options && q.options[0]))
            }));
            setEditingQuestions(questionsWithAnswers);

            setTimeout(() => {
                setStep(4);
                setProcessing(false);
            }, 500);

            showSuccess('Quiz generated successfully!');
        } catch (err) {
            clearInterval(progressInterval);
            showError(err.message);
            setProcessing(false);
            setStep(2);
        }
    };

    // Question editing
    const updateQuestion = (index, field, value) => {
        const updated = [...editingQuestions];
        updated[index] = { ...updated[index], [field]: value };
        setEditingQuestions(updated);
    };

    const updateOption = (questionIndex, optionIndex, value) => {
        const updated = [...editingQuestions];
        const newOptions = [...updated[questionIndex].options];
        newOptions[optionIndex] = value;
        updated[questionIndex] = { ...updated[questionIndex], options: newOptions };
        setEditingQuestions(updated);
    };

    const setCorrectAnswer = (questionIndex, answer) => {
        const updated = [...editingQuestions];
        updated[questionIndex] = { ...updated[questionIndex], correctAnswer: answer };
        setEditingQuestions(updated);
    };

    const removeQuestion = (index) => {
        setEditingQuestions(editingQuestions.filter((_, i) => i !== index));
    };

    // Check if all questions have correct answers
    const allQuestionsHaveAnswers = () => {
        return editingQuestions.every(q => {
            if (!q.correctAnswer) return false;
            if (q.type === 'multiple_choice' && !q.options.includes(q.correctAnswer)) return false;
            if (q.type === 'true_false' && !['true', 'false'].includes(q.correctAnswer)) return false;
            return true;
        });
    };

    // Save quiz (create new quiz in DB)
    const saveQuiz = async () => {
        if (editingQuestions.length < 5) {
            showError('Quiz must have at least 5 questions');
            return;
        }

        if (!allQuestionsHaveAnswers()) {
            showError('All questions must have a correct answer selected');
            return;
        }

        try {
            // Save the quiz to database
            const response = await fetch(`${API_URL}/api/quizzes/save-document-quiz`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: generatedQuiz.title,
                    category: generatedQuiz.category,
                    difficulty: generatedQuiz.difficulty,
                    questions: editingQuestions
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save quiz');
            }

            showSuccess('Quiz saved successfully!');
            onQuizCreated && onQuizCreated();
            onClose();
        } catch (err) {
            showError(err.message);
        }
    };

    // Render steps
    const renderStep1 = () => (
        <div style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>📄 Upload Your Document</h3>

            {!file ? (
                <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    style={{
                        border: `2px dashed ${dragActive ? 'var(--primary)' : 'var(--glass-border)'}`,
                        borderRadius: '16px',
                        padding: '3rem 2rem',
                        textAlign: 'center',
                        background: dragActive ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.05)',
                        transition: 'all 0.3s',
                        cursor: 'pointer'
                    }}
                    onClick={() => document.getElementById('fileInput').click()}
                >
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📚</div>
                    <h4>Drag & Drop Your Document</h4>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                        or click to browse
                    </p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Supported: PDF, TXT (Max 10MB)
                    </p>
                    <input
                        id="fileInput"
                        type="file"
                        accept=".pdf,.txt"
                        onChange={handleFileInput}
                        style={{ display: 'none' }}
                    />
                </div>
            ) : (
                <div style={{
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                }}>
                    <div style={{ fontSize: '2.5rem' }}>📄</div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{file.name}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {(file.size / 1024).toFixed(2)} KB
                        </div>
                    </div>
                    <button
                        onClick={removeFile}
                        style={{
                            background: 'rgba(239, 68, 68, 0.2)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#ef4444',
                            padding: '0.5rem 1rem',
                            fontSize: '0.85rem'
                        }}
                    >
                        Remove
                    </button>
                </div>
            )}

            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)' }}>
                    Cancel
                </button>
                <button
                    onClick={() => setStep(2)}
                    disabled={!file}
                    style={{
                        background: file ? 'linear-gradient(135deg, var(--primary), var(--secondary))' : 'rgba(148, 163, 184, 0.2)',
                        cursor: file ? 'pointer' : 'not-allowed',
                        opacity: file ? 1 : 0.6
                    }}
                >
                    Next: Configure Quiz →
                </button>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div style={{ padding: '2rem', maxHeight: '60vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>⚙️ Configure Your Quiz</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Category */}
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                        Category/Topic *
                    </label>
                    <input
                        type="text"
                        value={config.category}
                        onChange={(e) => setConfig({ ...config, category: e.target.value })}
                        placeholder="e.g., Literature, Biology, History"
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '8px',
                            color: 'white'
                        }}
                    />
                </div>

                {/* Number of Questions */}
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                        Number of Questions: {config.numQuestions}
                    </label>
                    <input
                        type="range"
                        min="5"
                        max="20"
                        value={config.numQuestions}
                        onChange={(e) => setConfig({ ...config, numQuestions: parseInt(e.target.value) })}
                        style={{ width: '100%' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <span>5</span>
                        <span>20</span>
                    </div>
                </div>

                {/* Difficulty */}
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                        Difficulty Level
                    </label>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        {['easy', 'medium', 'hard'].map(level => (
                            <button
                                key={level}
                                onClick={() => setConfig({ ...config, difficulty: level })}
                                style={{
                                    flex: 1,
                                    padding: '0.75rem',
                                    background: config.difficulty === level
                                        ? 'linear-gradient(135deg, var(--primary), var(--secondary))'
                                        : 'rgba(255,255,255,0.05)',
                                    border: config.difficulty === level ? 'none' : '1px solid var(--glass-border)',
                                    textTransform: 'capitalize'
                                }}
                            >
                                {level}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Question Types */}
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                        Question Types
                    </label>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {[
                            { value: 'multiple_choice', label: 'Multiple Choice' },
                            { value: 'true_false', label: 'True/False' }
                        ].map(type => (
                            <label key={type.value} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.75rem 1rem',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '8px',
                                cursor: 'pointer'
                            }}>
                                <input
                                    type="checkbox"
                                    checked={config.questionTypes.includes(type.value)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setConfig({
                                                ...config,
                                                questionTypes: [...config.questionTypes, type.value]
                                            });
                                        } else {
                                            setConfig({
                                                ...config,
                                                questionTypes: config.questionTypes.filter(t => t !== type.value)
                                            });
                                        }
                                    }}
                                />
                                {type.label}
                            </label>
                        ))}
                    </div>
                </div>

                {/* Focus Area (Optional) */}
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                        Focus Area <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>(Optional)</span>
                    </label>
                    <input
                        type="text"
                        value={config.focusArea}
                        onChange={(e) => setConfig({ ...config, focusArea: e.target.value })}
                        placeholder="e.g., Chapters 1-3, Introduction section"
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '8px',
                            color: 'white'
                        }}
                    />
                </div>

                {/* Keywords (Optional) */}
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                        Focus Keywords <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>(Optional)</span>
                    </label>
                    <input
                        type="text"
                        value={config.keywords}
                        onChange={(e) => setConfig({ ...config, keywords: e.target.value })}
                        placeholder="e.g., photosynthesis, cell structure"
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '8px',
                            color: 'white'
                        }}
                    />
                </div>
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'space-between' }}>
                <button onClick={() => setStep(1)} style={{ background: 'rgba(255,255,255,0.1)' }}>
                    ← Back
                </button>
                <button
                    onClick={generateQuiz}
                    disabled={!config.category.trim() || config.questionTypes.length === 0}
                    style={{
                        background: (config.category.trim() && config.questionTypes.length > 0)
                            ? 'linear-gradient(135deg, var(--primary), var(--secondary))'
                            : 'rgba(148, 163, 184, 0.2)',
                        cursor: (config.category.trim() && config.questionTypes.length > 0) ? 'pointer' : 'not-allowed',
                        opacity: (config.category.trim() && config.questionTypes.length > 0) ? 1 : 0.6
                    }}
                >
                    Generate Quiz ✨
                </button>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🤖</div>
            <h3 style={{ marginBottom: '1rem' }}>Generating Your Quiz...</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                Our AI is analyzing your document and creating questions
            </p>

            {/* Progress Bar */}
            <div style={{
                width: '100%',
                maxWidth: '400px',
                margin: '0 auto 1rem',
                height: '8px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '4px',
                overflow: 'hidden'
            }}>
                <div style={{
                    width: `${progress}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
                    transition: 'width 0.3s ease'
                }} />
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                {progress}% Complete
            </div>

            {/* Processing Steps */}
            <div style={{ marginTop: '2rem', textAlign: 'left', maxWidth: '400px', margin: '2rem auto 0' }}>
                {[
                    { label: 'Extracting text from document', done: progress > 20 },
                    { label: 'Analyzing content', done: progress > 40 },
                    { label: 'Generating questions', done: progress > 70 },
                    { label: 'Finalizing quiz', done: progress > 90 }
                ].map((item, idx) => (
                    <div key={idx} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        marginBottom: '0.5rem',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '8px'
                    }}>
                        <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: item.done ? 'linear-gradient(135deg, var(--primary), var(--secondary))' : 'rgba(255,255,255,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem'
                        }}>
                            {item.done && '✓'}
                        </div>
                        <span style={{ color: item.done ? 'white' : 'var(--text-muted)' }}>
                            {item.label}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderStep4 = () => (
        <div style={{ padding: '2rem', maxHeight: '70vh', overflowY: 'auto' }}>
            {/* Header - Not Sticky */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem'
            }}>
                <div>
                    <h3 style={{ margin: 0, marginBottom: '0.5rem' }}>✏️ Preview & Edit Your Quiz</h3>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Review and customize your questions before saving
                    </div>
                </div>
            </div>

            {/* Quiz Info Card */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15))',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: '16px',
                padding: '1.5rem',
                marginBottom: '2rem',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.1)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '2rem' }}>📚</div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '700', fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                            {generatedQuiz?.title}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <span>📝 {editingQuestions.length} questions</span>
                            <span>•</span>
                            <span>⚡ {config.difficulty}</span>
                            <span>•</span>
                            <span>📂 {config.category}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Questions List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {editingQuestions.map((q, idx) => (
                    <div key={idx} style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '16px',
                        padding: '1.5rem',
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                        className="hover-lift">
                        {/* Question Header */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: '1.25rem',
                            gap: '1rem'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                flex: 1
                            }}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '8px',
                                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: '700',
                                    fontSize: '0.9rem',
                                    flexShrink: 0
                                }}>
                                    {idx + 1}
                                </div>
                                <div style={{
                                    fontSize: '0.75rem',
                                    padding: '0.35rem 0.75rem',
                                    background: q.type === 'multiple_choice'
                                        ? 'rgba(59, 130, 246, 0.2)'
                                        : 'rgba(168, 85, 247, 0.2)',
                                    border: `1px solid ${q.type === 'multiple_choice' ? '#3b82f6' : '#a855f7'}`,
                                    borderRadius: '6px',
                                    color: q.type === 'multiple_choice' ? '#60a5fa' : '#c084fc',
                                    fontWeight: '600',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    {q.type === 'multiple_choice' ? '📋 Multiple Choice' : '✓ True/False'}
                                </div>
                            </div>
                            <button
                                onClick={() => removeQuestion(idx)}
                                style={{
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    color: '#ef4444',
                                    padding: '0.5rem 1rem',
                                    fontSize: '0.85rem',
                                    borderRadius: '8px',
                                    fontWeight: '600',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
                                    e.currentTarget.style.transform = 'scale(1.05)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                                    e.currentTarget.style.transform = 'scale(1)';
                                }}
                            >
                                🗑️ Remove
                            </button>
                        </div>

                        {/* Question Text */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '0.5rem',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                color: 'var(--text-muted)'
                            }}>
                                Question Text
                            </label>
                            <textarea
                                value={q.text}
                                onChange={(e) => updateQuestion(idx, 'text', e.target.value)}
                                placeholder="Enter your question here..."
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '2px solid var(--glass-border)',
                                    borderRadius: '12px',
                                    color: 'white',
                                    fontSize: '1rem',
                                    minHeight: '100px',
                                    resize: 'vertical',
                                    fontFamily: 'inherit',
                                    transition: 'all 0.2s ease'
                                }}
                                onFocus={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--primary)';
                                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)';
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--glass-border)';
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                }}
                            />
                        </div>

                        {/* Multiple Choice Options */}
                        {q.type === 'multiple_choice' && q.options && (
                            <div>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '1rem',
                                    fontSize: '0.85rem',
                                    fontWeight: '600',
                                    color: 'var(--text-muted)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}>
                                    <span>Answer Options</span>
                                    <span style={{
                                        fontSize: '0.75rem',
                                        color: '#22c55e',
                                        background: 'rgba(34, 197, 94, 0.1)',
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '4px'
                                    }}>
                                        Click card to mark correct
                                    </span>
                                </label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {q.options.map((opt, optIdx) => {
                                        const isCorrect = opt === q.correctAnswer;
                                        const optionLabels = ['A', 'B', 'C', 'D'];

                                        return (
                                            <div
                                                key={optIdx}
                                                onClick={() => setCorrectAnswer(idx, opt)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.75rem',
                                                    padding: '0.75rem',
                                                    background: isCorrect
                                                        ? 'rgba(34, 197, 94, 0.1)'
                                                        : 'rgba(255,255,255,0.03)',
                                                    border: `2px solid ${isCorrect ? '#22c55e' : 'var(--glass-border)'}`,
                                                    borderRadius: '12px',
                                                    transition: 'all 0.2s ease',
                                                    cursor: 'pointer'
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!isCorrect) {
                                                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                                        e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!isCorrect) {
                                                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                                        e.currentTarget.style.borderColor = 'var(--glass-border)';
                                                    }
                                                }}>
                                                {/* Option Label */}
                                                <div style={{
                                                    width: '32px',
                                                    height: '32px',
                                                    borderRadius: '8px',
                                                    background: isCorrect
                                                        ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                                                        : 'rgba(255,255,255,0.1)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: '700',
                                                    fontSize: '0.85rem',
                                                    flexShrink: 0,
                                                    color: isCorrect ? 'white' : 'var(--text-muted)'
                                                }}>
                                                    {optionLabels[optIdx]}
                                                </div>

                                                {/* Option Input */}
                                                <input
                                                    type="text"
                                                    value={opt}
                                                    onChange={(e) => {
                                                        e.stopPropagation();
                                                        updateOption(idx, optIdx, e.target.value);
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    placeholder={`Option ${optionLabels[optIdx]}`}
                                                    style={{
                                                        flex: 1,
                                                        padding: '0.75rem',
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: 'white',
                                                        fontSize: '0.95rem',
                                                        outline: 'none'
                                                    }}
                                                />

                                                {/* Correct Indicator */}
                                                {isCorrect && (
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                        padding: '0.35rem 0.75rem',
                                                        background: 'rgba(34, 197, 94, 0.2)',
                                                        borderRadius: '6px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600',
                                                        color: '#22c55e'
                                                    }}>
                                                        ✓ Correct Answer
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* True/False Options */}
                        {q.type === 'true_false' && (
                            <div>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '1rem',
                                    fontSize: '0.85rem',
                                    fontWeight: '600',
                                    color: 'var(--text-muted)'
                                }}>
                                    Select Correct Answer
                                </label>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    {['true', 'false'].map(answer => {
                                        const isCorrect = q.correctAnswer === answer;

                                        return (
                                            <div
                                                key={answer}
                                                onClick={() => setCorrectAnswer(idx, answer)}
                                                style={{
                                                    flex: 1,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '0.75rem',
                                                    padding: '1.25rem',
                                                    background: isCorrect
                                                        ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.2))'
                                                        : 'rgba(255,255,255,0.03)',
                                                    border: `2px solid ${isCorrect ? '#22c55e' : 'var(--glass-border)'}`,
                                                    borderRadius: '12px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    position: 'relative',
                                                    overflow: 'hidden'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                    e.currentTarget.style.boxShadow = 'none';
                                                }}>
                                                <div style={{
                                                    fontSize: '1.5rem',
                                                    marginRight: '0.5rem'
                                                }}>
                                                    {answer === 'true' ? '✓' : '✗'}
                                                </div>
                                                <span style={{
                                                    fontWeight: '700',
                                                    fontSize: '1.1rem',
                                                    textTransform: 'capitalize',
                                                    color: isCorrect ? '#22c55e' : 'white'
                                                }}>
                                                    {answer}
                                                </span>
                                                {isCorrect && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: '0.5rem',
                                                        right: '0.5rem',
                                                        padding: '0.25rem 0.5rem',
                                                        background: 'rgba(34, 197, 94, 0.3)',
                                                        borderRadius: '4px',
                                                        fontSize: '0.7rem',
                                                        fontWeight: '600',
                                                        color: '#22c55e'
                                                    }}>
                                                        CORRECT
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Action Buttons - Not Sticky */}
            <div style={{
                marginTop: '2rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid var(--glass-border)',
                display: 'flex',
                gap: '1rem',
                justifyContent: 'space-between'
            }}>
                <button
                    onClick={() => setStep(2)}
                    style={{
                        background: 'rgba(255,255,255,0.1)',
                        padding: '0.75rem 1.5rem',
                        fontSize: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    ← Regenerate Quiz
                </button>
                <button
                    onClick={saveQuiz}
                    disabled={editingQuestions.length < 5 || !allQuestionsHaveAnswers()}
                    style={{
                        background: (editingQuestions.length >= 5 && allQuestionsHaveAnswers())
                            ? 'linear-gradient(135deg, var(--primary), var(--secondary))'
                            : 'rgba(148, 163, 184, 0.2)',
                        cursor: (editingQuestions.length >= 5 && allQuestionsHaveAnswers()) ? 'pointer' : 'not-allowed',
                        opacity: (editingQuestions.length >= 5 && allQuestionsHaveAnswers()) ? 1 : 0.6,
                        padding: '0.75rem 2rem',
                        fontSize: '1rem',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        boxShadow: editingQuestions.length >= 5 ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none'
                    }}
                >
                    💾 Save Quiz ({editingQuestions.length} questions)
                </button>
            </div>
        </div>
    );

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
        }}>
            <div className="glass-card" style={{
                maxWidth: '800px',
                width: '100%',
                maxHeight: '90vh',
                overflow: 'hidden',
                position: 'relative'
            }}>
                {/* Progress Indicator */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '1.5rem 2rem',
                    borderBottom: '1px solid var(--glass-border)'
                }}>
                    {[
                        { num: 1, label: 'Upload' },
                        { num: 2, label: 'Configure' },
                        { num: 3, label: 'Generate' },
                        { num: 4, label: 'Preview' }
                    ].map(s => (
                        <div key={s.num} style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.5rem',
                            flex: 1
                        }}>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: step >= s.num
                                    ? 'linear-gradient(135deg, var(--primary), var(--secondary))'
                                    : 'rgba(255,255,255,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: '600',
                                fontSize: '0.9rem'
                            }}>
                                {step > s.num ? '✓' : s.num}
                            </div>
                            <div style={{
                                fontSize: '0.75rem',
                                color: step >= s.num ? 'white' : 'var(--text-muted)'
                            }}>
                                {s.label}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Step Content */}
                <div>
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                    {step === 4 && renderStep4()}
                </div>
            </div>
        </div>
    );
};

export default DocumentQuizGenerator;
