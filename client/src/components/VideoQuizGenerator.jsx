import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import API_URL from '../config';

const VideoQuizGenerator = ({ onClose, onQuizCreated }) => {
    const { token } = useAuth();
    const { showSuccess, showError } = useToast();


    // State management
    const [currentStep, setCurrentStep] = useState(1);
    const [videoUrl, setVideoUrl] = useState('');
    const [videoPreview, setVideoPreview] = useState(null);
    const [isValidating, setIsValidating] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Quiz configuration
    const [config, setConfig] = useState({
        numQuestions: 10,
        difficulty: 'medium',
        questionTypes: ['multiple_choice', 'true_false'],
        category: 'General'
    });

    // Generated quiz data
    const [quizData, setQuizData] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

    // Handle video URL input
    const handleUrlChange = (e) => {
        setVideoUrl(e.target.value);
        setVideoPreview(null);
    };

    // Validate video URL
    const validateVideo = async () => {
        if (!videoUrl.trim()) {
            showError('Please enter a video URL');
            return;
        }

        setIsValidating(true);
        try {
            const response = await fetch(`${API_URL}/api/quizzes/video/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ url: videoUrl })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to validate video URL');
            }

            if (data.type === 'playlist') {
                showError('Playlist support coming soon. Please use individual video URLs.');
                return;
            }

            if (!data.isEnglish) {
                showError(`This video is in ${data.language}. Currently only English videos are supported.`);
                return;
            }

            setVideoPreview(data);
            setCurrentStep(2);
            showSuccess('Video validated successfully!');
        } catch (error) {
            showError(error.message);
        } finally {
            setIsValidating(false);
        }
    };

    // Generate quiz from video
    const generateQuiz = async () => {
        setIsGenerating(true);
        try {
            const response = await fetch(`${API_URL}/api/quizzes/video/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    url: videoUrl,
                    config: {
                        ...config,
                        category: config.category || 'General'
                    }
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate quiz');
            }

            setQuizData(data);
            setQuestions(data.questions);
            setCurrentStep(3);
            showSuccess(`Generated ${data.questions.length} questions successfully!`);
        } catch (error) {
            showError(error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    // Update question
    const updateQuestion = (index, field, value) => {
        const updated = [...questions];
        updated[index] = { ...updated[index], [field]: value };
        setQuestions(updated);
    };

    // Update option for multiple choice questions
    const updateOption = (questionIndex, optionIndex, value) => {
        const updated = [...questions];
        const options = [...updated[questionIndex].options];
        options[optionIndex] = value;
        updated[questionIndex].options = options;
        setQuestions(updated);
    };

    // Set correct answer
    const setCorrectAnswer = (questionIndex, answer) => {
        const updated = [...questions];
        updated[questionIndex].correctAnswer = answer;
        setQuestions(updated);
    };

    // Remove question
    const removeQuestion = (index) => {
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

    // Check if all questions are valid
    const allQuestionsValid = () => {
        return questions.every(q => {
            if (!q.text || !q.correctAnswer) return false;
            if (q.type === 'multiple_choice') {
                return q.options && q.options.length >= 2 && q.options.includes(q.correctAnswer);
            }
            return true;
        });
    };

    // Save quiz
    const saveQuiz = async () => {
        if (!allQuestionsValid()) {
            showError('Please ensure all questions have valid answers');
            return;
        }

        setIsSaving(true);
        try {
            const response = await fetch(`${API_URL}/api/quizzes/save-video-quiz`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: quizData.title,
                    category: config.category,
                    difficulty: config.difficulty,
                    questions,
                    videoUrl: quizData.videoUrl,
                    videoPlatform: quizData.videoPlatform,
                    videoId: quizData.videoId,
                    videoTitle: quizData.videoTitle,
                    videoDuration: quizData.videoDuration,
                    videoThumbnail: quizData.videoThumbnail
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to save quiz');
            }

            showSuccess('Quiz saved successfully!');
            if (onQuizCreated) {
                onQuizCreated(data);
            }
            if (onClose) {
                onClose();
            }
        } catch (error) {
            showError(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    // Format duration
    const formatDuration = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    // Render Step 1: Video URL Input
    const renderStep1 = () => (
        <div className="video-quiz-step">
            <h2>🎥 Create Quiz from YouTube Video</h2>
            <p>Enter a YouTube video URL to generate a quiz from its content</p>

            <div className="video-url-input-section">
                <label htmlFor="videoUrl">YouTube Video URL</label>
                <input
                    type="url"
                    id="videoUrl"
                    value={videoUrl}
                    onChange={handleUrlChange}
                    placeholder="https://www.youtube.com/watch?v=..."
                    disabled={isValidating}
                />
                <small>Paste a YouTube video URL (playlists coming soon)</small>
            </div>

            {videoPreview && (
                <div className="video-preview-card">
                    <img src={videoPreview.thumbnail} alt={videoPreview.title} />
                    <div className="video-preview-info">
                        <h3>{videoPreview.title}</h3>
                        <p>Duration: {formatDuration(videoPreview.duration)}</p>
                        <p>Channel: {videoPreview.author}</p>
                        <span className="video-language-badge">
                            {videoPreview.isEnglish ? '✓ English' : `⚠️ ${videoPreview.language}`}
                        </span>
                    </div>
                </div>
            )}

            <div className="step-actions">
                <button onClick={onClose} className="btn-secondary">
                    Cancel
                </button>
                <button
                    onClick={validateVideo}
                    disabled={isValidating || !videoUrl.trim()}
                    className="btn-primary"
                >
                    {isValidating ? 'Validating...' : 'Next'}
                </button>
            </div>
        </div>
    );

    // Render Step 2: Configuration
    const renderStep2 = () => (
        <div className="video-quiz-step">
            <h2>⚙️ Configure Quiz</h2>
            <p>Customize your quiz settings</p>

            {videoPreview && (
                <div className="video-preview-mini">
                    <img src={videoPreview.thumbnail} alt={videoPreview.title} />
                    <span>{videoPreview.title}</span>
                </div>
            )}

            <div className="config-section">
                <div className="config-field">
                    <label htmlFor="category">Category</label>
                    <input
                        type="text"
                        id="category"
                        value={config.category}
                        onChange={(e) => setConfig({ ...config, category: e.target.value })}
                        placeholder="e.g., Science, History, Technology"
                    />
                </div>

                <div className="config-field">
                    <label htmlFor="numQuestions">Number of Questions</label>
                    <input
                        type="number"
                        id="numQuestions"
                        min="5"
                        max="50"
                        value={config.numQuestions}
                        onChange={(e) => setConfig({ ...config, numQuestions: parseInt(e.target.value) })}
                    />
                    <small>5-50 questions</small>
                </div>

                <div className="config-field">
                    <label htmlFor="difficulty">Difficulty Level</label>
                    <select
                        id="difficulty"
                        value={config.difficulty}
                        onChange={(e) => setConfig({ ...config, difficulty: e.target.value })}
                    >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                    </select>
                </div>

                <div className="config-field">
                    <label>Question Types</label>
                    <div className="checkbox-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={config.questionTypes.includes('multiple_choice')}
                                onChange={(e) => {
                                    const types = e.target.checked
                                        ? [...config.questionTypes, 'multiple_choice']
                                        : config.questionTypes.filter(t => t !== 'multiple_choice');
                                    setConfig({ ...config, questionTypes: types });
                                }}
                            />
                            Multiple Choice
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                checked={config.questionTypes.includes('true_false')}
                                onChange={(e) => {
                                    const types = e.target.checked
                                        ? [...config.questionTypes, 'true_false']
                                        : config.questionTypes.filter(t => t !== 'true_false');
                                    setConfig({ ...config, questionTypes: types });
                                }}
                            />
                            True/False
                        </label>
                    </div>
                </div>
            </div>

            <div className="step-actions">
                <button onClick={() => setCurrentStep(1)} className="btn-secondary">
                    Back
                </button>
                <button
                    onClick={generateQuiz}
                    disabled={isGenerating || config.questionTypes.length === 0}
                    className="btn-primary"
                >
                    {isGenerating ? 'Generating Quiz...' : 'Generate Quiz'}
                </button>
            </div>
        </div>
    );

    // Render Step 3: Review & Edit Questions
    const renderStep3 = () => {
        const currentQuestion = questions[currentQuestionIndex];

        return (
            <div className="video-quiz-step">
                <h2>✏️ Review & Edit Questions</h2>
                <p>Review and modify the generated questions before saving</p>

                <div className="question-navigation">
                    <button
                        onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                        disabled={currentQuestionIndex === 0}
                        className="nav-btn"
                    >
                        ← Previous
                    </button>
                    <span className="question-counter">
                        Question {currentQuestionIndex + 1} of {questions.length}
                    </span>
                    <button
                        onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
                        disabled={currentQuestionIndex === questions.length - 1}
                        className="nav-btn"
                    >
                        Next →
                    </button>
                </div>

                {currentQuestion && (
                    <div className="question-editor">
                        <div className="question-header">
                            <span className="question-type-badge">
                                {currentQuestion.type === 'multiple_choice' ? 'Multiple Choice' : 'True/False'}
                            </span>
                            <button
                                onClick={() => removeQuestion(currentQuestionIndex)}
                                className="btn-danger-small"
                                disabled={questions.length <= 5}
                            >
                                Delete
                            </button>
                        </div>

                        <div className="question-text-editor">
                            <label>Question Text</label>
                            <textarea
                                value={currentQuestion.text}
                                onChange={(e) => updateQuestion(currentQuestionIndex, 'text', e.target.value)}
                                rows="3"
                                placeholder="Enter question text..."
                            />
                        </div>

                        {currentQuestion.type === 'multiple_choice' ? (
                            <div className="options-editor">
                                <label>Answer Options</label>
                                {currentQuestion.options.map((option, idx) => (
                                    <div key={idx} className="option-row">
                                        <input
                                            type="radio"
                                            name={`correct-${currentQuestionIndex}`}
                                            checked={currentQuestion.correctAnswer === option}
                                            onChange={() => setCorrectAnswer(currentQuestionIndex, option)}
                                        />
                                        <input
                                            type="text"
                                            value={option}
                                            onChange={(e) => updateOption(currentQuestionIndex, idx, e.target.value)}
                                            placeholder={`Option ${idx + 1}`}
                                        />
                                    </div>
                                ))}
                                <small>Select the correct answer by clicking the radio button</small>
                            </div>
                        ) : (
                            <div className="true-false-editor">
                                <label>Correct Answer</label>
                                <div className="radio-group">
                                    <label>
                                        <input
                                            type="radio"
                                            name={`tf-${currentQuestionIndex}`}
                                            checked={currentQuestion.correctAnswer === 'true'}
                                            onChange={() => setCorrectAnswer(currentQuestionIndex, 'true')}
                                        />
                                        True
                                    </label>
                                    <label>
                                        <input
                                            type="radio"
                                            name={`tf-${currentQuestionIndex}`}
                                            checked={currentQuestion.correctAnswer === 'false'}
                                            onChange={() => setCorrectAnswer(currentQuestionIndex, 'false')}
                                        />
                                        False
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="quiz-summary">
                    <h3>Quiz Summary</h3>
                    <p><strong>Title:</strong> {quizData.title}</p>
                    <p><strong>Category:</strong> {config.category}</p>
                    <p><strong>Difficulty:</strong> {config.difficulty}</p>
                    <p><strong>Questions:</strong> {questions.length}</p>
                    <p><strong>Video:</strong> {quizData.videoTitle}</p>
                </div>

                <div className="step-actions">
                    <button onClick={() => setCurrentStep(2)} className="btn-secondary">
                        Back to Config
                    </button>
                    <button
                        onClick={saveQuiz}
                        disabled={isSaving || !allQuestionsValid()}
                        className="btn-primary"
                    >
                        {isSaving ? 'Saving...' : 'Save Quiz'}
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="video-quiz-generator-overlay">
            <div className="video-quiz-generator-modal">
                <div className="progress-indicator">
                    <div className={`progress-step ${currentStep >= 1 ? 'active' : ''}`}>1. Video</div>
                    <div className={`progress-step ${currentStep >= 2 ? 'active' : ''}`}>2. Configure</div>
                    <div className={`progress-step ${currentStep >= 3 ? 'active' : ''}`}>3. Review</div>
                </div>

                {currentStep === 1 && renderStep1()}
                {currentStep === 2 && renderStep2()}
                {currentStep === 3 && renderStep3()}
            </div>
        </div>
    );
};

export default VideoQuizGenerator;
