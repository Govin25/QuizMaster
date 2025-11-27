/**
 * AI Quiz Generator Service
 * Generates quiz questions from document content using AI
 */

class AIQuizGenerator {
    /**
     * Generate quiz from document text
     * @param {string} text - Extracted document text
     * @param {object} config - Quiz configuration
     * @returns {Promise<Array>} Generated questions
     */
    async generateQuiz(text, config) {
        const {
            numQuestions = 10,
            difficulty = 'medium',
            questionTypes = ['multiple_choice', 'true_false'],
            focusArea = '',
            keywords = ''
        } = config;

        try {
            // In production, this would call an actual AI API (OpenAI, Claude, Gemini, etc.)
            // For now, we'll use a mock implementation
            return await this.mockGenerateQuiz(text, config);
        } catch (error) {
            console.error('Quiz generation error:', error);
            throw new Error('Failed to generate quiz: ' + error.message);
        }
    }

    /**
     * Mock quiz generation for testing
     * In production, replace with actual AI API calls
     */
    async mockGenerateQuiz(text, config) {
        const {
            numQuestions = 10,
            difficulty = 'medium',
            questionTypes = ['multiple_choice', 'true_false']
        } = config;

        const questions = [];
        const mcCount = Math.floor(numQuestions * 0.7); // 70% multiple choice
        const tfCount = numQuestions - mcCount; // 30% true/false

        // Generate multiple choice questions
        if (questionTypes.includes('multiple_choice')) {
            for (let i = 0; i < mcCount; i++) {
                questions.push(this.generateMockMCQuestion(text, difficulty, i + 1));
            }
        }

        // Generate true/false questions
        if (questionTypes.includes('true_false')) {
            for (let i = 0; i < tfCount; i++) {
                questions.push(this.generateMockTFQuestion(text, difficulty, i + 1));
            }
        }

        // Shuffle questions
        return this.shuffleArray(questions).slice(0, numQuestions);
    }

    /**
     * Generate a mock multiple choice question
     */
    generateMockMCQuestion(text, difficulty, index) {
        const topics = this.extractTopics(text);
        const topic = topics[index % topics.length] || 'the subject';

        const questions = [
            {
                text: `What is the primary function of ${topic}?`,
                options: [
                    `To facilitate ${topic} processes`,
                    `To inhibit ${topic} reactions`,
                    `To store ${topic} energy`,
                    `To transport ${topic} materials`
                ],
                correctAnswer: `To facilitate ${topic} processes`
            },
            {
                text: `Which of the following best describes ${topic}?`,
                options: [
                    `A complex biological process`,
                    `A simple chemical reaction`,
                    `An inorganic compound`,
                    `A physical phenomenon`
                ],
                correctAnswer: `A complex biological process`
            },
            {
                text: `What role does ${topic} play in the overall system?`,
                options: [
                    `It serves as a catalyst`,
                    `It acts as a barrier`,
                    `It provides structural support`,
                    `It regulates temperature`
                ],
                correctAnswer: `It serves as a catalyst`
            }
        ];

        const selected = questions[index % questions.length];
        return {
            type: 'multiple_choice',
            ...selected
        };
    }

    /**
     * Generate a mock true/false question
     */
    generateMockTFQuestion(text, difficulty, index) {
        const topics = this.extractTopics(text);
        const topic = topics[index % topics.length] || 'the subject';

        const questions = [
            {
                text: `${topic} is essential for the process described in the document.`,
                correctAnswer: 'true'
            },
            {
                text: `The document suggests that ${topic} has no significant impact.`,
                correctAnswer: 'false'
            },
            {
                text: `According to the text, ${topic} occurs naturally in the environment.`,
                correctAnswer: 'true'
            },
            {
                text: `${topic} is mentioned as a recent discovery in the field.`,
                correctAnswer: 'false'
            }
        ];

        const selected = questions[index % questions.length];
        return {
            type: 'true_false',
            ...selected
        };
    }

    /**
     * Extract key topics from text
     */
    extractTopics(text) {
        // Simple topic extraction - in production, use NLP
        const words = text.toLowerCase().split(/\s+/);
        const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those']);

        const wordFreq = {};
        words.forEach(word => {
            if (word.length > 4 && !commonWords.has(word)) {
                wordFreq[word] = (wordFreq[word] || 0) + 1;
            }
        });

        // Get top topics
        const topics = Object.entries(wordFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([word]) => word);

        return topics.length > 0 ? topics : ['photosynthesis', 'chlorophyll', 'energy', 'oxygen', 'carbon dioxide'];
    }

    /**
     * Shuffle array
     */
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    /**
     * Validate generated questions
     */
    validateQuestions(questions) {
        return questions.filter(q => {
            // Ensure question has required fields
            if (!q.text || !q.type || !q.correctAnswer) {
                return false;
            }

            // Validate multiple choice questions
            if (q.type === 'multiple_choice') {
                if (!q.options || q.options.length < 2) {
                    return false;
                }
                if (!q.options.includes(q.correctAnswer)) {
                    return false;
                }
            }

            // Validate true/false questions
            if (q.type === 'true_false') {
                if (!['true', 'false'].includes(q.correctAnswer.toLowerCase())) {
                    return false;
                }
            }

            return true;
        });
    }

    /**
     * Format questions for database storage
     */
    formatQuestionsForDB(questions) {
        return questions.map(q => ({
            type: q.type,
            text: q.text,
            options: q.type === 'multiple_choice' ? q.options : null,
            correctAnswer: q.correctAnswer
        }));
    }
}

module.exports = new AIQuizGenerator();
