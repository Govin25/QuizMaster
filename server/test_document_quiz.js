const aiQuizGenerator = require('./src/services/aiQuizGenerator');
const fs = require('fs');

async function testDocumentQuizGeneration() {
    try {
        console.log('Testing Document Quiz Generation with AI...\n');

        // Read test document
        const documentText = fs.readFileSync('./test_document.txt', 'utf-8');
        console.log('Document loaded. Length:', documentText.length, 'characters\n');

        // Configuration
        const config = {
            numQuestions: 5,
            difficulty: 'medium',
            questionTypes: ['multiple_choice', 'true_false']
        };

        console.log('Configuration:', JSON.stringify(config, null, 2), '\n');
        console.log('Generating quiz...\n');

        // Generate quiz
        const questions = await aiQuizGenerator.generateQuiz(documentText, config);

        console.log('='.repeat(80));
        console.log('GENERATED QUESTIONS');
        console.log('='.repeat(80), '\n');

        questions.forEach((q, index) => {
            console.log(`Question ${index + 1}:`);
            console.log(`Type: ${q.type}`);
            console.log(`Text: ${q.text}`);

            if (q.type === 'multiple_choice') {
                console.log('Options:');
                q.options.forEach((opt, i) => {
                    const marker = opt === q.correctAnswer ? '✓' : ' ';
                    console.log(`  ${marker} ${String.fromCharCode(65 + i)}. ${opt}`);
                });
            } else {
                console.log(`Correct Answer: ${q.correctAnswer}`);
            }

            console.log('\n' + '-'.repeat(80) + '\n');
        });

        console.log('Test completed successfully!');
        console.log(`Generated ${questions.length} questions`);

        // Check if AI was used
        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        if (apiKey) {
            console.log('\n✅ AI (Gemini) was used for generation');
        } else {
            console.log('\n⚠️  Mock generator was used (no API key found)');
            console.log('Add GEMINI_API_KEY to .env for AI-powered questions');
        }

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

testDocumentQuizGeneration();
