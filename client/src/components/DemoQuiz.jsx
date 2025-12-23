import React, { useState, useEffect } from 'react';
import './DemoQuiz.css';

const DemoQuiz = ({ onClose, onSignUp }) => {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [score, setScore] = useState(0);
    const [showResult, setShowResult] = useState(false);
    const [answered, setAnswered] = useState(false);
    const [timeLeft, setTimeLeft] = useState(15);

    // Static General Knowledge Quiz - 5 questions
    const questions = [
        {
            question: "Which planet is known as the Red Planet?",
            options: ["Venus", "Mars", "Jupiter", "Saturn"],
            correct: 1
        },
        {
            question: "What is the largest ocean on Earth?",
            options: ["Atlantic Ocean", "Indian Ocean", "Pacific Ocean", "Arctic Ocean"],
            correct: 2
        },
        {
            question: "Who painted the Mona Lisa?",
            options: ["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Michelangelo"],
            correct: 2
        },
        {
            question: "What is the capital of Japan?",
            options: ["Seoul", "Beijing", "Bangkok", "Tokyo"],
            correct: 3
        },
        {
            question: "How many continents are there on Earth?",
            options: ["5", "6", "7", "8"],
            correct: 2
        }
    ];

    // Timer countdown
    useEffect(() => {
        if (showResult || answered) return;

        if (timeLeft === 0) {
            handleTimeout();
            return;
        }

        const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
        return () => clearTimeout(timer);
    }, [timeLeft, showResult, answered]);

    const handleTimeout = () => {
        setAnswered(true);
        setTimeout(() => nextQuestion(), 1500);
    };

    const handleAnswer = (index) => {
        if (answered) return;

        setSelectedAnswer(index);
        setAnswered(true);

        if (index === questions[currentQuestion].correct) {
            setScore(score + 1);
        }

        setTimeout(() => nextQuestion(), 1500);
    };

    const nextQuestion = () => {
        if (currentQuestion < questions.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
            setSelectedAnswer(null);
            setAnswered(false);
            setTimeLeft(15);
        } else {
            setShowResult(true);
        }
    };

    const getOptionClass = (index) => {
        if (!answered) return '';
        if (index === questions[currentQuestion].correct) return 'correct';
        if (index === selectedAnswer && selectedAnswer !== questions[currentQuestion].correct) return 'incorrect';
        return 'dimmed';
    };

    const percentage = Math.round((score / questions.length) * 100);

    if (showResult) {
        return (
            <div className="demo-quiz-overlay" onClick={onClose}>
                <div className="demo-quiz-modal result-modal" onClick={e => e.stopPropagation()}>
                    <button className="demo-close-btn" onClick={onClose}>×</button>

                    <div className="result-content">
                        <div className="result-emoji">
                            {percentage >= 80 ? '🎉' : percentage >= 60 ? '👍' : '💪'}
                        </div>
                        <h2 className="result-title">Quiz Complete!</h2>
                        <div className="result-score">
                            <span className="score-value">{score}</span>
                            <span className="score-total">/{questions.length}</span>
                        </div>
                        <p className="result-percentage">{percentage}% correct</p>

                        <div className="result-message">
                            {percentage >= 80 ? (
                                <p>Excellent recall! Imagine doing this for everything you learn.</p>
                            ) : percentage >= 60 ? (
                                <p>Good job! Regular quizzing would make this even better.</p>
                            ) : (
                                <p>This is exactly why active recall matters. Keep practicing!</p>
                            )}
                        </div>

                        <div className="result-cta">
                            <p className="cta-text">Ready to stop forgetting what you learn?</p>
                            <button className="demo-signup-btn" onClick={onSignUp}>
                                Create Free Account
                                <span className="arrow">→</span>
                            </button>
                            <p className="cta-subtext">Generate quizzes on any topic with AI</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="demo-quiz-overlay" onClick={onClose}>
            <div className="demo-quiz-modal" onClick={e => e.stopPropagation()}>
                <button className="demo-close-btn" onClick={onClose}>×</button>

                <div className="demo-quiz-header">
                    <div className="quiz-topic">🧠 General Knowledge</div>
                    <div className="quiz-progress">
                        Question {currentQuestion + 1} of {questions.length}
                    </div>
                </div>

                <div className="demo-timer-bar">
                    <div
                        className="timer-fill"
                        style={{ width: `${(timeLeft / 15) * 100}%` }}
                    />
                </div>
                <div className="demo-timer-text">{timeLeft}s</div>

                <div className="demo-question">
                    <h3>{questions[currentQuestion].question}</h3>
                </div>

                <div className="demo-options">
                    {questions[currentQuestion].options.map((option, index) => (
                        <button
                            key={index}
                            className={`demo-option ${getOptionClass(index)} ${selectedAnswer === index ? 'selected' : ''}`}
                            onClick={() => handleAnswer(index)}
                            disabled={answered}
                        >
                            <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                            <span className="option-text">{option}</span>
                        </button>
                    ))}
                </div>

                <div className="demo-score-indicator">
                    Score: {score}/{questions.length}
                </div>
            </div>
        </div>
    );
};

export default DemoQuiz;
