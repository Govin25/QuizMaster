const db = require('./src/db');
const bcrypt = require('bcrypt');

// 10 Categories for the quizzes
const CATEGORIES = [
    'Programming',
    'Science',
    'History',
    'Geography',
    'Mathematics',
    'Literature',
    'Technology',
    'Arts',
    'Sports',
    'General Knowledge'
];

// Difficulty levels
const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

// Sample question templates
const QUESTION_TEMPLATES = {
    multiple_choice: [
        {
            text: 'What is the correct answer to this question?',
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctAnswer: 'Option A'
        },
        {
            text: 'Which of the following is the best choice?',
            options: ['First Choice', 'Second Choice', 'Third Choice', 'Fourth Choice'],
            correctAnswer: 'First Choice'
        },
        {
            text: 'Select the most appropriate answer:',
            options: ['Answer 1', 'Answer 2', 'Answer 3', 'Answer 4'],
            correctAnswer: 'Answer 1'
        }
    ],
    true_false: [
        {
            text: 'This statement is true.',
            correctAnswer: 'true'
        },
        {
            text: 'This statement is false.',
            correctAnswer: 'false'
        }
    ]
};

// Generate random quiz title
function generateQuizTitle(category, index) {
    const titlePrefixes = [
        'Master',
        'Ultimate',
        'Complete',
        'Advanced',
        'Essential',
        'Comprehensive',
        'Quick',
        'Expert',
        'Beginner\'s',
        'Professional'
    ];

    const titleSuffixes = [
        'Challenge',
        'Test',
        'Quiz',
        'Assessment',
        'Examination',
        'Practice',
        'Knowledge Check',
        'Trivia',
        'Questions',
        'Review'
    ];

    const prefix = titlePrefixes[Math.floor(Math.random() * titlePrefixes.length)];
    const suffix = titleSuffixes[Math.floor(Math.random() * titleSuffixes.length)];

    return `${prefix} ${category} ${suffix} #${index}`;
}

// Generate a random question
function generateQuestion(quizId, questionIndex, category) {
    const isTrueFalse = Math.random() < 0.3; // 30% chance of true/false

    if (isTrueFalse) {
        const template = QUESTION_TEMPLATES.true_false[Math.floor(Math.random() * QUESTION_TEMPLATES.true_false.length)];
        return {
            quiz_id: quizId,
            type: 'true_false',
            question_text: `${category} Q${questionIndex}: ${template.text}`,
            options: null,
            correct_answer: template.correctAnswer
        };
    } else {
        const template = QUESTION_TEMPLATES.multiple_choice[Math.floor(Math.random() * QUESTION_TEMPLATES.multiple_choice.length)];
        return {
            quiz_id: quizId,
            type: 'multiple_choice',
            question_text: `${category} Q${questionIndex}: ${template.text}`,
            options: JSON.stringify(template.options),
            correct_answer: template.correctAnswer
        };
    }
}

async function seedDummyQuizzes() {
    console.log('🚀 Starting to seed 1000 dummy quizzes...\n');

    // Wait for DB to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
        // First, ensure we have a System user
        let systemUserId;
        const existingUser = await new Promise((resolve, reject) => {
            db.get('SELECT id FROM users WHERE username = ?', ['System'], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (existingUser) {
            systemUserId = existingUser.id;
            console.log(`✓ Using existing System user (ID: ${systemUserId})`);
        } else {
            console.log('Creating System user...');
            const hashedPassword = await bcrypt.hash('system123', 10);
            systemUserId = await new Promise((resolve, reject) => {
                db.run(
                    'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
                    ['System', hashedPassword, 'admin'],
                    function (err) {
                        if (err) reject(err);
                        else resolve(this.lastID);
                    }
                );
            });
            console.log(`✓ Created System user (ID: ${systemUserId})`);
        }

        // Create 1000 quizzes
        console.log('\n📚 Creating 1000 quizzes...');
        let quizzesCreated = 0;

        for (let i = 1; i <= 1000; i++) {
            // Randomly select a category
            const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];

            // Randomly select a difficulty
            const difficulty = DIFFICULTIES[Math.floor(Math.random() * DIFFICULTIES.length)];

            // Generate quiz title
            const title = generateQuizTitle(category, i);

            // Create the quiz
            const quizId = await new Promise((resolve, reject) => {
                db.run(
                    'INSERT INTO quizzes (title, category, difficulty, creator_id, status, is_public) VALUES (?, ?, ?, ?, ?, ?)',
                    [title, category, difficulty, systemUserId, 'approved', 1],
                    function (err) {
                        if (err) reject(err);
                        else resolve(this.lastID);
                    }
                );
            });

            // Create 10 questions for this quiz
            for (let q = 1; q <= 10; q++) {
                const question = generateQuestion(quizId, q, category);

                await new Promise((resolve, reject) => {
                    db.run(
                        'INSERT INTO questions (quiz_id, type, question_text, options, correct_answer) VALUES (?, ?, ?, ?, ?)',
                        [question.quiz_id, question.type, question.question_text, question.options, question.correct_answer],
                        function (err) {
                            if (err) reject(err);
                            else resolve(this.lastID);
                        }
                    );
                });
            }

            quizzesCreated++;

            // Progress indicator every 100 quizzes
            if (quizzesCreated % 100 === 0) {
                console.log(`  ✓ Created ${quizzesCreated} quizzes...`);
            }
        }

        console.log(`\n✅ Successfully created ${quizzesCreated} quizzes with 10 questions each!`);

        // Display distribution by category
        console.log('\n📊 Quiz Distribution by Category:');
        for (const category of CATEGORIES) {
            const count = await new Promise((resolve, reject) => {
                db.get(
                    'SELECT COUNT(*) as count FROM quizzes WHERE category = ? AND creator_id = ?',
                    [category, systemUserId],
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(row.count);
                    }
                );
            });
            console.log(`  ${category.padEnd(20)} : ${count} quizzes`);
        }

        // Total verification
        const totalQuizzes = await new Promise((resolve, reject) => {
            db.get(
                'SELECT COUNT(*) as count FROM quizzes WHERE creator_id = ?',
                [systemUserId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count);
                }
            );
        });

        const totalQuestions = await new Promise((resolve, reject) => {
            db.get(
                'SELECT COUNT(*) as count FROM questions WHERE quiz_id IN (SELECT id FROM quizzes WHERE creator_id = ?)',
                [systemUserId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count);
                }
            );
        });

        console.log('\n📈 Final Statistics:');
        console.log(`  Total Quizzes: ${totalQuizzes}`);
        console.log(`  Total Questions: ${totalQuestions}`);
        console.log(`  All quizzes are PUBLIC and APPROVED for the Quiz Hub`);

        console.log('\n🎉 Dummy quiz seeding completed successfully!');
        process.exit(0);

    } catch (err) {
        console.error('❌ Error during seeding:', err);
        process.exit(1);
    }
}

seedDummyQuizzes();
