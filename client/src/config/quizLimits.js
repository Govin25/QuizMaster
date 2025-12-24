/**
 * Centralized Quiz Configuration
 * Contains all quiz-related limits and defaults
 */

// Question limits
export const QUIZ_LIMITS = {
    // Minimum questions required for any quiz
    MIN_QUESTIONS: 1,

    // Maximum questions for regular users
    MAX_QUESTIONS: 30,

    // Maximum questions for premium users
    MAX_QUESTIONS_PREMIUM: 200,

    // Default number of questions when generating
    DEFAULT_QUESTIONS: 10
};

// Option limits
export const OPTION_LIMITS = {
    // Minimum options for multiple choice
    MIN_OPTIONS: 2,

    // Maximum options for multiple choice
    MAX_OPTIONS: 6,

    // Maximum character length for an option
    MAX_OPTION_LENGTH: 200
};

// Helper function to get max questions based on user type
export const getMaxQuestions = (isPremium = false) => {
    return isPremium ? QUIZ_LIMITS.MAX_QUESTIONS_PREMIUM : QUIZ_LIMITS.MAX_QUESTIONS;
};

// Validation helper
export const validateQuestionCount = (count, isPremium = false) => {
    const max = getMaxQuestions(isPremium);
    if (count < QUIZ_LIMITS.MIN_QUESTIONS) {
        return { valid: false, error: `Quiz must have at least ${QUIZ_LIMITS.MIN_QUESTIONS} question` };
    }
    if (count > max) {
        return { valid: false, error: `Quiz cannot have more than ${max} questions` };
    }
    return { valid: true };
};

export default QUIZ_LIMITS;
