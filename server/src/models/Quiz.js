const QuizRepository = require('../repositories/QuizRepository');
const { MultipleChoiceQuestion, TrueFalseQuestion } = require('./Question');

class Quiz {
    constructor(id, title, category, difficulty, questions = [], creator_id = null, is_public = false, status = 'draft', created_at = null, source = 'manual') {
        this.id = id;
        this.title = title;
        this.category = category;
        this.difficulty = difficulty;
        this.questions = questions;
        this.creator_id = creator_id;
        this.is_public = is_public;
        this.status = status;
        this.created_at = created_at;
        this.source = source;
    }

    static async create(title, category, difficulty, creator_id = null, source = 'manual') {
        const quiz = await QuizRepository.create({ title, category, difficulty, creator_id, source });
        return new Quiz(quiz.id, title, category, difficulty, [], creator_id, false, 'draft', quiz.created_at, source);
    }

    static async addQuestion(quizId, questionData) {
        const question = await QuizRepository.addQuestion(quizId, questionData);
        return question.id;
    }

    static async updateStatus(id, status, is_public) {
        return await QuizRepository.updateStatus(id, status, is_public);
    }

    static async getById(id) {
        const quiz = await QuizRepository.findById(id, true);

        if (!quiz) return null;

        const questions = quiz.questions.map(q => {
            if (q.type === 'multiple_choice') {
                return new MultipleChoiceQuestion(q.id, q.question_text, q.options, q.correct_answer);
            } else {
                return new TrueFalseQuestion(q.id, q.question_text, q.correct_answer);
            }
        });

        return new Quiz(
            quiz.id,
            quiz.title,
            quiz.category,
            quiz.difficulty,
            questions,
            quiz.creator_id,
            quiz.is_public,
            quiz.status,
            quiz.created_at,
            quiz.source
        );
    }

    static async getAll() {
        return await QuizRepository.findAll();
    }

    static async getPublicQuizzes() {
        return await QuizRepository.findPublic();
    }

    static async getUserQuizzes(userId) {
        return await QuizRepository.findByCreator(userId);
    }
}

module.exports = Quiz;
