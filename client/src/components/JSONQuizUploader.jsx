import React, { useState, useRef } from 'react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const JSONQuizUploader = ({ onClose, onQuizCreated }) => {
    const { showSuccess, showError } = useToast();
    const { fetchWithAuth } = useAuth();
    const [jsonText, setJsonText] = useState('');
    const [validationErrors, setValidationErrors] = useState([]);
    const [parsedQuizzes, setParsedQuizzes] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [showSample, setShowSample] = useState(true);
    const [showPrompt, setShowPrompt] = useState(false);
    const fileInputRef = useRef(null);

    const sampleJSON = {
        title: "JavaScript Fundamentals",
        category: "Programming",
        difficulty: "Beginner",
        questions: [
            {
                type: "multiple_choice",
                text: "What is the correct way to declare a variable in JavaScript?",
                options: ["var x = 5", "variable x = 5", "int x = 5", "x := 5"],
                correctAnswer: "var x = 5"
            },
            {
                type: "true_false",
                text: "JavaScript is a compiled language.",
                correctAnswer: "false"
            },
            {
                type: "multiple_choice",
                text: "Which symbol is used for single-line comments?",
                options: ["//", "/*", "#", "--"],
                correctAnswer: "//"
            },
            {
                type: "multiple_choice",
                text: "What does DOM stand for?",
                options: ["Document Object Model", "Data Object Model", "Digital Object Manager", "Document Oriented Model"],
                correctAnswer: "Document Object Model"
            },
            {
                type: "multiple_choice",
                text: "Which method is used to parse a string to an integer?",
                options: ["parseInt()", "parseInteger()", "toInt()", "convertInt()"],
                correctAnswer: "parseInt()"
            }
        ]
    };

    const aiPrompt = `Create a quiz in JSON format following this exact schema:

{
  "title": "Quiz Title Here",
  "category": "Category Name (e.g., Programming, Science, History)",
  "difficulty": "Beginner|Intermediate|Advanced|Expert",
  "questions": [
    {
      "type": "multiple_choice",
      "text": "Question text here?",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctAnswer": "Option 1"
    },
    {
      "type": "true_false",
      "text": "True/False question text here?",
      "correctAnswer": "true"
    }
  ]
}

IMPORTANT RULES:
- Each quiz must have between 5 and 20 questions
- For multiple_choice questions, provide 2-6 options
- The correctAnswer must EXACTLY match one of the options (case-sensitive)
- For true_false questions, correctAnswer must be "true" or "false" (lowercase)
- You can provide a single quiz object OR an array of multiple quiz objects

Please create a quiz about: [YOUR TOPIC HERE]`;

    const validateQuiz = (quiz) => {
        const errors = [];

        // Required fields
        if (!quiz.title || typeof quiz.title !== 'string') {
            errors.push('Missing or invalid "title" field');
        }
        if (!quiz.category || typeof quiz.category !== 'string') {
            errors.push('Missing or invalid "category" field');
        }
        if (!['Beginner', 'Intermediate', 'Advanced', 'Expert'].includes(quiz.difficulty)) {
            errors.push('Invalid "difficulty" - must be Beginner, Intermediate, Advanced, or Expert');
        }

        // Questions validation
        if (!Array.isArray(quiz.questions)) {
            errors.push('Missing or invalid "questions" array');
            return errors;
        }

        if (quiz.questions.length < 5) {
            errors.push(`Quiz must have at least 5 questions (found ${quiz.questions.length})`);
        }
        if (quiz.questions.length > 20) {
            errors.push(`Quiz must have at most 20 questions (found ${quiz.questions.length})`);
        }

        quiz.questions.forEach((q, idx) => {
            if (!q.type || !['multiple_choice', 'true_false'].includes(q.type)) {
                errors.push(`Question ${idx + 1}: Invalid type - must be "multiple_choice" or "true_false"`);
            }
            if (!q.text || typeof q.text !== 'string') {
                errors.push(`Question ${idx + 1}: Missing or invalid "text" field`);
            }

            if (q.type === 'multiple_choice') {
                if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6) {
                    errors.push(`Question ${idx + 1}: Multiple choice must have 2-6 options`);
                }
                if (!q.correctAnswer || !q.options?.includes(q.correctAnswer)) {
                    errors.push(`Question ${idx + 1}: correctAnswer must exactly match one of the options`);
                }
            }

            if (q.type === 'true_false') {
                if (!['true', 'false'].includes(q.correctAnswer)) {
                    errors.push(`Question ${idx + 1}: True/False correctAnswer must be "true" or "false"`);
                }
            }

            if (!q.correctAnswer) {
                errors.push(`Question ${idx + 1}: Missing "correctAnswer" field`);
            }
        });

        return errors;
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            setJsonText(event.target.result);
            validateJSON(event.target.result);
        };
        reader.readAsText(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'application/json') {
            const reader = new FileReader();
            reader.onload = (event) => {
                setJsonText(event.target.result);
                validateJSON(event.target.result);
            };
            reader.readAsText(file);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const validateJSON = (text) => {
        if (!text.trim()) {
            setValidationErrors([]);
            setParsedQuizzes(null);
            return;
        }

        try {
            const parsed = JSON.parse(text);
            const quizzes = Array.isArray(parsed) ? parsed : [parsed];

            let allErrors = [];
            quizzes.forEach((quiz, idx) => {
                const errors = validateQuiz(quiz);
                if (errors.length > 0) {
                    allErrors.push(`Quiz ${idx + 1}: ${errors.join(', ')}`);
                }
            });

            if (allErrors.length === 0) {
                setParsedQuizzes(quizzes);
                setValidationErrors([]);
            } else {
                setParsedQuizzes(null);
                setValidationErrors(allErrors);
            }
        } catch (err) {
            setValidationErrors([`Invalid JSON: ${err.message}`]);
            setParsedQuizzes(null);
        }
    };

    const handleTextChange = (e) => {
        const text = e.target.value;
        setJsonText(text);
        validateJSON(text);
    };

    const handleSubmit = async () => {
        if (!parsedQuizzes || validationErrors.length > 0) return;

        setIsUploading(true);
        try {
            const response = await fetchWithAuth('/api/quizzes/upload-json', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ quizzes: parsedQuizzes })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to upload quizzes');
            }

            const result = await response.json();
            showSuccess(`Successfully created ${result.count} quiz${result.count > 1 ? 'zes' : ''}!`);
            onQuizCreated();
        } catch (error) {
            showError(error.message);
        } finally {
            setIsUploading(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        showSuccess('Copied to clipboard!');
    };

    return (
        <div className="glass-card" style={{ maxWidth: '1000px', width: '100%' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{
                    fontSize: '3rem',
                    marginBottom: '0.5rem',
                    filter: 'drop-shadow(0 0 10px rgba(245, 158, 11, 0.5))'
                }}>
                    📤
                </div>
                <h2 style={{
                    margin: '0 0 0.5rem 0',
                    fontSize: '1.8rem',
                    background: 'linear-gradient(to right, #f59e0b, #f97316)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>
                    Upload Quiz JSON
                </h2>
                <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                    Upload single or multiple quizzes in JSON format
                </p>
            </div>

            {/* Tabs */}
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '1.5rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                paddingBottom: '0.5rem',
                flexWrap: 'wrap'
            }}>
                <button
                    onClick={() => { setShowSample(true); setShowPrompt(false); }}
                    style={{
                        background: showSample ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                        border: 'none',
                        color: showSample ? '#f59e0b' : 'var(--text-muted)',
                        padding: '0.5rem 0.75rem',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        fontWeight: showSample ? '600' : '400',
                        fontSize: '0.85rem',
                        whiteSpace: 'nowrap'
                    }}
                >
                    📋 Sample JSON
                </button>
                <button
                    onClick={() => { setShowSample(false); setShowPrompt(true); }}
                    style={{
                        background: showPrompt ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                        border: 'none',
                        color: showPrompt ? '#f59e0b' : 'var(--text-muted)',
                        padding: '0.5rem 0.75rem',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        fontWeight: showPrompt ? '600' : '400',
                        fontSize: '0.85rem',
                        whiteSpace: 'nowrap'
                    }}
                >
                    🤖 AI Prompt Template
                </button>
                <button
                    onClick={() => { setShowSample(false); setShowPrompt(false); }}
                    style={{
                        background: !showSample && !showPrompt ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                        border: 'none',
                        color: !showSample && !showPrompt ? '#f59e0b' : 'var(--text-muted)',
                        padding: '0.5rem 0.75rem',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        fontWeight: !showSample && !showPrompt ? '600' : '400',
                        fontSize: '0.85rem',
                        whiteSpace: 'nowrap'
                    }}
                >
                    📤 Upload
                </button>
            </div>

            {/* Sample JSON Section */}
            {showSample && (
                <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.5rem'
                    }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', color: 'white' }}>Sample Quiz JSON</h3>
                        <button
                            onClick={() => copyToClipboard(JSON.stringify(sampleJSON, null, 2))}
                            style={{
                                background: 'rgba(245, 158, 11, 0.2)',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                color: '#f59e0b',
                                padding: '0.5rem 1rem',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.85rem'
                            }}
                        >
                            📋 Copy Sample
                        </button>
                    </div>
                    <pre style={{
                        background: 'rgba(0, 0, 0, 0.3)',
                        padding: '1rem',
                        borderRadius: '8px',
                        overflow: 'auto',
                        maxHeight: '400px',
                        fontSize: '0.85rem',
                        color: '#a3e635',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        textAlign: 'left',
                        fontFamily: 'monospace',
                        lineHeight: '1.5'
                    }}>
                        {JSON.stringify(sampleJSON, null, 2)}
                    </pre>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        💡 For multiple quizzes, wrap them in an array: <code style={{ color: '#f59e0b' }}>[{'{...}'}, {'{...}'}]</code>
                    </p>
                </div>
            )}

            {/* AI Prompt Section */}
            {showPrompt && (
                <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.5rem'
                    }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', color: 'white' }}>AI Prompt Template</h3>
                        <button
                            onClick={() => copyToClipboard(aiPrompt)}
                            style={{
                                background: 'rgba(245, 158, 11, 0.2)',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                color: '#f59e0b',
                                padding: '0.5rem 1rem',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.85rem'
                            }}
                        >
                            📋 Copy Prompt
                        </button>
                    </div>
                    <pre style={{
                        background: 'rgba(0, 0, 0, 0.3)',
                        padding: '1rem',
                        borderRadius: '8px',
                        overflow: 'auto',
                        maxHeight: '400px',
                        fontSize: '0.85rem',
                        color: '#c4b5fd',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        whiteSpace: 'pre-wrap',
                        textAlign: 'left',
                        fontFamily: 'monospace',
                        lineHeight: '1.5'
                    }}>
                        {aiPrompt}
                    </pre>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        🤖 Copy this prompt and paste it into ChatGPT, Claude, or any AI assistant. Replace [YOUR TOPIC HERE] with your desired quiz topic!
                    </p>
                </div>
            )}

            {/* Upload Section */}
            {!showSample && !showPrompt && (
                <>
                    {/* File Upload Area */}
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            border: '2px dashed rgba(245, 158, 11, 0.3)',
                            borderRadius: '12px',
                            padding: '2rem',
                            textAlign: 'center',
                            cursor: 'pointer',
                            marginBottom: '1.5rem',
                            background: 'rgba(245, 158, 11, 0.05)',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📁</div>
                        <p style={{ margin: '0 0 0.5rem 0', color: 'white' }}>
                            Click to upload or drag and drop
                        </p>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            JSON files only
                        </p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            onChange={handleFileUpload}
                            style={{ display: 'none' }}
                        />
                    </div>

                    {/* JSON Text Area */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            color: 'white',
                            fontSize: '0.9rem'
                        }}>
                            Or paste JSON directly:
                        </label>
                        <textarea
                            value={jsonText}
                            onChange={handleTextChange}
                            placeholder="Paste your quiz JSON here..."
                            style={{
                                width: '100%',
                                minHeight: '300px',
                                background: 'rgba(0, 0, 0, 0.3)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '8px',
                                padding: '1rem',
                                color: 'white',
                                fontSize: '0.85rem',
                                fontFamily: 'monospace',
                                resize: 'vertical'
                            }}
                        />
                    </div>

                    {/* Validation Errors */}
                    {validationErrors.length > 0 && (
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '8px',
                            padding: '1rem',
                            marginBottom: '1.5rem'
                        }}>
                            <h4 style={{ margin: '0 0 0.5rem 0', color: '#ef4444', fontSize: '0.9rem' }}>
                                ❌ Validation Errors:
                            </h4>
                            <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#fca5a5' }}>
                                {validationErrors.map((error, idx) => (
                                    <li key={idx} style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                                        {error}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Preview */}
                    {parsedQuizzes && validationErrors.length === 0 && (
                        <div style={{
                            background: 'rgba(34, 197, 94, 0.1)',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            borderRadius: '8px',
                            padding: '1rem',
                            marginBottom: '1.5rem'
                        }}>
                            <h4 style={{ margin: '0 0 0.5rem 0', color: '#22c55e', fontSize: '0.9rem' }}>
                                ✅ Valid! Preview:
                            </h4>
                            {parsedQuizzes.map((quiz, idx) => (
                                <div key={idx} style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    padding: '0.75rem',
                                    borderRadius: '6px',
                                    marginBottom: idx < parsedQuizzes.length - 1 ? '0.5rem' : 0
                                }}>
                                    <div style={{ color: 'white', fontWeight: '600', marginBottom: '0.25rem' }}>
                                        {idx + 1}. {quiz.title}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        {quiz.category} • {quiz.difficulty} • {quiz.questions.length} questions
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Action Buttons */}
            <div style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'center',
                marginTop: '2rem',
                flexWrap: 'wrap'
            }}>
                <button
                    onClick={onClose}
                    style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        padding: '0.75rem 2rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        minWidth: '120px',
                        flex: '1 1 auto',
                        maxWidth: '200px'
                    }}
                >
                    Cancel
                </button>
                {!showSample && !showPrompt && (
                    <button
                        onClick={handleSubmit}
                        disabled={!parsedQuizzes || validationErrors.length > 0 || isUploading}
                        style={{
                            background: parsedQuizzes && validationErrors.length === 0
                                ? 'linear-gradient(135deg, #f59e0b, #f97316)'
                                : 'rgba(255, 255, 255, 0.1)',
                            border: 'none',
                            color: 'white',
                            padding: '0.75rem 2rem',
                            borderRadius: '8px',
                            cursor: parsedQuizzes && validationErrors.length === 0 ? 'pointer' : 'not-allowed',
                            fontSize: '0.9rem',
                            opacity: parsedQuizzes && validationErrors.length === 0 ? 1 : 0.5,
                            minWidth: '120px',
                            flex: '1 1 auto',
                            maxWidth: '200px'
                        }}
                    >
                        {isUploading ? 'Uploading...' : `Upload ${parsedQuizzes ? `(${parsedQuizzes.length})` : ''}`}
                    </button>
                )}
            </div>
        </div>
    );
};

export default JSONQuizUploader;
