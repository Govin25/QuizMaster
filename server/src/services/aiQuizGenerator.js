const logger = require('../utils/logger');
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * AI Quiz Generator Service
 * Generates quiz questions from document content and video transcripts using AI
 * Enhanced with better quality and video-specific features
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
            // Check for API key
            const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

            if (apiKey) {
                return await this.generateWithGemini(text, config, apiKey);
            }

            logger.warn('No AI API key found, using mock generator');
            return await this.mockGenerateQuiz(text, config);
        } catch (error) {
            logger.error('Failed to generate quiz from text', {
                error,
                context: { textLength: text?.length, config }
            });
            throw new Error('Failed to generate quiz: ' + error.message);
        }
    }

    /**
     * Generate quiz from video transcript (enhanced for video content)
     * @param {object} transcript - Transcript object with fullText and segments
     * @param {object} config - Quiz configuration
     * @returns {Promise<Array>} Generated questions
     */
    async generateFromVideoTranscript(transcript, config) {
        const {
            numQuestions = 10,
            difficulty = 'medium',
            questionTypes = ['multiple_choice', 'true_false']
        } = config;

        try {
            logger.info('Generating quiz from video transcript', {
                wordCount: transcript.wordCount,
                segmentCount: transcript.segments?.length,
                config
            });

            // Check for API key
            const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

            if (apiKey) {
                return await this.generateWithGemini(transcript.fullText, config, apiKey);
            }

            logger.warn('No AI API key found, using mock generator for video');

            // Extract topics from full transcript
            const topics = this.extractVideoTopics(transcript.fullText);

            // Use segments for better context if available
            const segments = transcript.segments || [{ text: transcript.fullText }];

            const questions = [];
            const mcCount = Math.floor(numQuestions * 0.7); // 70% multiple choice
            const tfCount = numQuestions - mcCount; // 30% true/false

            // Generate questions from different segments for variety
            const segmentIndices = this.selectSegmentIndices(segments.length, numQuestions);

            // Generate multiple choice questions
            if (questionTypes.includes('multiple_choice')) {
                for (let i = 0; i < mcCount; i++) {
                    const segmentIndex = segmentIndices[i % segmentIndices.length];
                    const segment = segments[segmentIndex];
                    const question = this.generateVideoMCQuestion(
                        segment.text,
                        topics,
                        difficulty,
                        i
                    );
                    questions.push(question);
                }
            }

            // Generate true/false questions
            if (questionTypes.includes('true_false')) {
                for (let i = 0; i < tfCount; i++) {
                    const segmentIndex = segmentIndices[(mcCount + i) % segmentIndices.length];
                    const segment = segments[segmentIndex];
                    const question = this.generateVideoTFQuestion(
                        segment.text,
                        topics,
                        difficulty,
                        i
                    );
                    questions.push(question);
                }
            }

            // Shuffle and validate
            const shuffled = this.shuffleArray(questions);
            const validated = this.validateQuestions(shuffled);

            logger.info('Quiz generated from video transcript', {
                requestedQuestions: numQuestions,
                generatedQuestions: validated.length
            });

            return validated.slice(0, numQuestions);
        } catch (error) {
            logger.error('Failed to generate quiz from video transcript', {
                error,
                context: { config }
            });
            throw new Error('Failed to generate quiz from video: ' + error.message);
        }
    }

    /**
     * Select segment indices for question generation (distribute across video)
     * @param {number} totalSegments - Total number of segments
     * @param {number} numQuestions - Number of questions to generate
     * @returns {Array} Selected segment indices
     */
    selectSegmentIndices(totalSegments, numQuestions) {
        if (totalSegments <= numQuestions) {
            return Array.from({ length: totalSegments }, (_, i) => i);
        }

        // Distribute questions evenly across segments
        const indices = [];
        const step = totalSegments / numQuestions;
        for (let i = 0; i < numQuestions; i++) {
            indices.push(Math.floor(i * step));
        }
        return indices;
    }

    /**
     * Extract topics from video transcript (enhanced)
     * @param {string} text - Transcript text
     * @returns {Array} Extracted topics
     */
    extractVideoTopics(text) {
        // Enhanced topic extraction with better filtering
        const words = text.toLowerCase().split(/\s+/);

        // Expanded common words list
        const commonWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
            'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
            'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that',
            'these', 'those', 'what', 'which', 'who', 'when', 'where', 'why',
            'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
            'some', 'such', 'only', 'own', 'same', 'than', 'too', 'very', 'just',
            'about', 'into', 'through', 'during', 'before', 'after', 'above',
            'below', 'between', 'under', 'again', 'further', 'then', 'once',
            'here', 'there', 'also', 'going', 'know', 'think', 'like', 'want',
            'make', 'take', 'see', 'come', 'get', 'give', 'use', 'find', 'tell',
            'ask', 'work', 'seem', 'feel', 'try', 'leave', 'call', 'really',
            'actually', 'basically', 'literally', 'okay', 'yeah', 'right'
        ]);

        const wordFreq = {};
        words.forEach(word => {
            // Clean word (remove punctuation)
            const cleaned = word.replace(/[^\w]/g, '');

            // Filter: length > 4, not common word, not a number
            if (cleaned.length > 4 && !commonWords.has(cleaned) && !/^\d+$/.test(cleaned)) {
                wordFreq[cleaned] = (wordFreq[cleaned] || 0) + 1;
            }
        });

        // Get top topics (more than before for better variety)
        const topics = Object.entries(wordFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([word]) => word);

        return topics.length > 0 ? topics : ['concept', 'topic', 'subject', 'idea', 'principle'];
    }

    /**
     * Generate video-specific multiple choice question
     * @param {string} segmentText - Text from video segment
     * @param {Array} topics - Extracted topics
     * @param {string} difficulty - Question difficulty
     * @param {number} index - Question index
     * @returns {object} Generated question
     */
    generateVideoMCQuestion(segmentText, topics, difficulty, index) {
        const topic = topics[index % topics.length] || 'the topic';

        // Extract sentences from segment for context
        const sentences = segmentText.split(/[.!?]+/).filter(s => s.trim().length > 20);
        const contextSentence = sentences[index % sentences.length] || segmentText.substring(0, 100);

        // Difficulty-based question templates
        const templates = this.getMCTemplatesByDifficulty(difficulty);
        const template = templates[index % templates.length];

        return {
            type: 'multiple_choice',
            text: template.question(topic, contextSentence),
            options: template.options(topic),
            correctAnswer: template.correctAnswer(topic)
        };
    }

    /**
     * Get multiple choice templates based on difficulty
     * @param {string} difficulty - Question difficulty
     * @returns {Array} Question templates
     */
    getMCTemplatesByDifficulty(difficulty) {
        const baseTemplates = {
            easy: [
                {
                    question: (topic) => `What is ${topic}?`,
                    options: (topic) => [
                        `A key concept discussed in the video`,
                        `An unrelated topic`,
                        `A type of software`,
                        `A mathematical formula`
                    ],
                    correctAnswer: () => `A key concept discussed in the video`
                },
                {
                    question: (topic) => `According to the video, what is the main purpose of ${topic}?`,
                    options: (topic) => [
                        `To explain important concepts`,
                        `To confuse the audience`,
                        `To sell products`,
                        `To waste time`
                    ],
                    correctAnswer: () => `To explain important concepts`
                },
                {
                    question: (topic) => `Which of the following is mentioned in relation to ${topic}?`,
                    options: (topic) => [
                        `Important characteristics and features`,
                        `Completely unrelated information`,
                        `Random facts`,
                        `Fictional stories`
                    ],
                    correctAnswer: () => `Important characteristics and features`
                }
            ],
            medium: [
                {
                    question: (topic) => `How does ${topic} relate to the main concepts discussed in the video?`,
                    options: (topic) => [
                        `It serves as a fundamental building block`,
                        `It has no connection to the main topic`,
                        `It contradicts the main points`,
                        `It is mentioned only in passing`
                    ],
                    correctAnswer: () => `It serves as a fundamental building block`
                },
                {
                    question: (topic) => `What role does ${topic} play in the overall explanation?`,
                    options: (topic) => [
                        `It helps illustrate key principles`,
                        `It distracts from the main message`,
                        `It provides entertainment value only`,
                        `It has no specific role`
                    ],
                    correctAnswer: () => `It helps illustrate key principles`
                },
                {
                    question: (topic) => `Based on the video, what can be inferred about ${topic}?`,
                    options: (topic) => [
                        `It is an important aspect of the subject matter`,
                        `It is irrelevant to the discussion`,
                        `It is mentioned incorrectly`,
                        `It is a minor detail`
                    ],
                    correctAnswer: () => `It is an important aspect of the subject matter`
                }
            ],
            hard: [
                {
                    question: (topic) => `Analyzing the video's explanation, how would ${topic} be best characterized?`,
                    options: (topic) => [
                        `As a critical component requiring deeper understanding`,
                        `As a superficial element with little importance`,
                        `As an outdated concept no longer relevant`,
                        `As a controversial topic with no clear answer`
                    ],
                    correctAnswer: () => `As a critical component requiring deeper understanding`
                },
                {
                    question: (topic) => `What implications does the discussion of ${topic} have for the broader subject?`,
                    options: (topic) => [
                        `It reveals fundamental principles that apply widely`,
                        `It limits the scope of understanding`,
                        `It creates confusion about the topic`,
                        `It has no broader implications`
                    ],
                    correctAnswer: () => `It reveals fundamental principles that apply widely`
                },
                {
                    question: (topic) => `Synthesizing the information presented, what is the most significant aspect of ${topic}?`,
                    options: (topic) => [
                        `Its role in connecting multiple concepts together`,
                        `Its ability to simplify complex ideas`,
                        `Its historical significance only`,
                        `Its entertainment value`
                    ],
                    correctAnswer: () => `Its role in connecting multiple concepts together`
                }
            ]
        };

        return baseTemplates[difficulty] || baseTemplates.medium;
    }

    /**
     * Generate video-specific true/false question
     * @param {string} segmentText - Text from video segment
     * @param {Array} topics - Extracted topics
     * @param {string} difficulty - Question difficulty
     * @param {number} index - Question index
     * @returns {object} Generated question
     */
    generateVideoTFQuestion(segmentText, topics, difficulty, index) {
        const topic = topics[index % topics.length] || 'the topic';

        const templates = this.getTFTemplatesByDifficulty(difficulty);
        const template = templates[index % templates.length];

        return {
            type: 'true_false',
            text: template.statement(topic),
            correctAnswer: template.answer
        };
    }

    /**
     * Get true/false templates based on difficulty
     * @param {string} difficulty - Question difficulty
     * @returns {Array} Question templates
     */
    getTFTemplatesByDifficulty(difficulty) {
        const baseTemplates = {
            easy: [
                {
                    statement: (topic) => `The video discusses ${topic} as an important concept.`,
                    answer: 'true'
                },
                {
                    statement: (topic) => `${topic} is completely ignored in the video.`,
                    answer: 'false'
                },
                {
                    statement: (topic) => `According to the video, ${topic} is mentioned as a key element.`,
                    answer: 'true'
                }
            ],
            medium: [
                {
                    statement: (topic) => `The video suggests that ${topic} plays a significant role in the overall explanation.`,
                    answer: 'true'
                },
                {
                    statement: (topic) => `Based on the video, ${topic} has no practical applications.`,
                    answer: 'false'
                },
                {
                    statement: (topic) => `The presenter indicates that understanding ${topic} is essential for grasping the main concepts.`,
                    answer: 'true'
                }
            ],
            hard: [
                {
                    statement: (topic) => `The video implies that ${topic} is a foundational concept that influences other aspects of the subject.`,
                    answer: 'true'
                },
                {
                    statement: (topic) => `According to the analysis presented, ${topic} contradicts the main thesis of the video.`,
                    answer: 'false'
                },
                {
                    statement: (topic) => `The discussion of ${topic} suggests it requires critical thinking to fully comprehend its implications.`,
                    answer: 'true'
                }
            ]
        };

        return baseTemplates[difficulty] || baseTemplates.medium;
    }

    /**
     * Generate quiz using Google Gemini API
     * @param {string} text - Content text
     * @param {object} config - Quiz configuration
     * @param {string} apiKey - API Key
     */
    async generateWithGemini(text, config, apiKey) {
        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            const {
                numQuestions = 10,
                difficulty = 'medium',
                questionTypes = ['multiple_choice', 'true_false']
            } = config;

            const prompt = `
                You are an expert quiz generator. Create a high-quality, in-depth quiz based on the following text.
                
                Configuration:
                - Number of questions: ${numQuestions}
                - Difficulty: ${difficulty} (adjust complexity accordingly)
                - Question Types: ${questionTypes.join(', ')}
                
                Requirements:
                1. Questions must be highly relevant to the specific content provided.
                2. For "hard" difficulty, ask about implications, analysis, and synthesis of ideas, not just facts.
                3. For "medium" difficulty, focus on understanding and application.
                4. Ensure distractors (wrong answers) are plausible but clearly incorrect based on the text.
                5. Return the result as a valid JSON array of question objects.
                
                Output Format (JSON Array):
                [
                    {
                        "type": "multiple_choice",
                        "text": "Question text here?",
                        "options": ["Option A", "Option B", "Option C", "Option D"],
                        "correctAnswer": "Option B"
                    },
                    {
                        "type": "true_false",
                        "text": "Statement here.",
                        "correctAnswer": "true" // or "false"
                    }
                ]

                Text Content:
                ${text.substring(0, 30000)} // Limit context window if needed
            `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const textResponse = response.text();

            // Extract JSON from response (handle potential markdown code blocks)
            const jsonMatch = textResponse.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                throw new Error('Failed to parse AI response as JSON');
            }

            const questions = JSON.parse(jsonMatch[0]);

            // Validate and format
            const validated = this.validateQuestions(questions);

            logger.info('Generated quiz with Gemini', {
                count: validated.length,
                difficulty
            });

            return validated.slice(0, numQuestions);

        } catch (error) {
            logger.error('Gemini generation failed', { error: error.message });
            // Fallback to mock if AI fails
            return this.mockGenerateQuiz(text, config);
        }
    }

    /**
     * Mock quiz generation for testing (enhanced)
     * In production, replace with actual AI API calls
     */
    async mockGenerateQuiz(text, config) {
        const {
            numQuestions = 10,
            difficulty = 'medium',
            questionTypes = ['multiple_choice', 'true_false']
        } = config;

        const topics = this.extractVideoTopics(text);
        const questions = [];
        const mcCount = Math.floor(numQuestions * 0.7); // 70% multiple choice
        const tfCount = numQuestions - mcCount; // 30% true/false

        // Generate multiple choice questions
        if (questionTypes.includes('multiple_choice')) {
            for (let i = 0; i < mcCount; i++) {
                questions.push(this.generateVideoMCQuestion(text, topics, difficulty, i));
            }
        }

        // Generate true/false questions
        if (questionTypes.includes('true_false')) {
            for (let i = 0; i < tfCount; i++) {
                questions.push(this.generateVideoTFQuestion(text, topics, difficulty, i));
            }
        }

        // Shuffle questions
        return this.shuffleArray(questions).slice(0, numQuestions);
    }

    /**
     * Extract key topics from text (legacy method for backward compatibility)
     */
    extractTopics(text) {
        return this.extractVideoTopics(text);
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
