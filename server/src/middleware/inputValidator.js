const { body, param, query, validationResult } = require('express-validator');

// Middleware to check validation results
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }
    next();
};

// Validation rules for user signup (email-based)
const validateSignup = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
    body('email')
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 8, max: 128 })
        .withMessage('Password must be between 8 and 128 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    validate
];

// Validation rules for user login (email or username)
const validateLogin = [
    body('identifier')
        .trim()
        .notEmpty()
        .withMessage('Email or username is required')
        .isLength({ max: 255 })
        .withMessage('Email or username is too long'),
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    validate
];

// Keep validateAuth for backwards compatibility (if used elsewhere)
const validateAuth = [
    body('username')
        .trim()
        .isLength({ min: 3, max: 30 })
        .withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
    body('password')
        .isLength({ min: 8, max: 128 })
        .withMessage('Password must be between 8 and 128 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    validate
];

// Validation rules for quiz creation
const validateQuiz = [
    body('title')
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage('Title must be between 3 and 200 characters')
        .escape(),
    body('category')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Category must be between 2 and 50 characters')
        .escape(),
    body('difficulty')
        .isIn(['easy', 'medium', 'hard'])
        .withMessage('Difficulty must be easy, medium, or hard'),
    validate
];

// Validation rules for questions
const validateQuestion = [
    body('type')
        .isIn(['multiple_choice', 'true_false'])
        .withMessage('Question type must be multiple_choice or true_false'),
    body('text')
        .trim()
        .isLength({ min: 5, max: 500 })
        .withMessage('Question text must be between 5 and 500 characters')
        .escape(),
    body('correctAnswer')
        .trim()
        .notEmpty()
        .withMessage('Correct answer is required')
        .escape(),
    body('options')
        .custom((value, { req }) => {
            // For true_false questions, options can be null or undefined
            if (req.body.type === 'true_false') {
                return true;
            }
            // For multiple_choice, options must be an array with 2-6 items
            if (req.body.type === 'multiple_choice') {
                if (!Array.isArray(value)) {
                    throw new Error('Options must be an array for multiple choice questions');
                }
                if (value.length < 2 || value.length > 6) {
                    throw new Error('Options must contain 2-6 items for multiple choice questions');
                }
            }
            return true;
        }),
    body('options.*')
        .if(body('type').equals('multiple_choice'))
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage('Each option must be between 1 and 200 characters')
        .escape(),
    validate
];

// Validation for search/filter parameters
const validateSearch = [
    query('player')
        .optional({ values: 'falsy' }) // Treat empty strings as optional
        .trim()
        .isLength({ max: 30 })
        .withMessage('Player search must be less than 30 characters')
        .escape(),
    query('quiz')
        .optional({ values: 'falsy' }) // Treat empty strings as optional
        .trim()
        .isLength({ max: 200 })
        .withMessage('Quiz search must be less than 200 characters')
        .escape(),
    query('attempt')
        .optional({ values: 'falsy' }) // Treat empty strings as optional
        .isInt({ min: 1, max: 1000 })
        .withMessage('Attempt must be a number between 1 and 1000'),
    query('page')
        .optional({ values: 'falsy' }) // Treat empty strings as optional
        .isInt({ min: 1, max: 10000 })
        .withMessage('Page must be a number between 1 and 10000'),
    query('limit')
        .optional({ values: 'falsy' }) // Treat empty strings as optional
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be a number between 1 and 100'),
    validate
];

// Validation for ID parameters
const validateId = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('ID must be a positive integer'),
    validate
];

// Validation for quiz status updates
const validateQuizStatus = [
    body('status')
        .isIn(['approved', 'rejected', 'pending_review', 'draft'])
        .withMessage('Invalid status'),
    body('comments')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Comments must be less than 1000 characters')
        .escape(),
    validate
];

module.exports = {
    validate,
    validateAuth,
    validateSignup,
    validateLogin,
    validateQuiz,
    validateQuestion,
    validateSearch,
    validateId,
    validateQuizStatus
};
