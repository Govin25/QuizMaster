const db = require('../db');
const { MultipleChoiceQuestion, TrueFalseQuestion } = require('./Question');

class Quiz {
    constructor(id, title, category, difficulty, questions = [], creator_id = null, is_public = false, status = 'draft', created_at = null) {
        this.id = id;
        this.title = title;
        this.category = category;
        this.difficulty = difficulty;
        this.questions = questions;
        this.creator_id = creator_id;
        this.is_public = is_public;
        this.status = status;
        this.created_at = created_at;
    }

    static async create(title, category, difficulty, creator_id = null) {
        return new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO quizzes (title, category, difficulty, creator_id) VALUES (?, ?, ?, ?)',
                [title, category, difficulty, creator_id],
                function (err) {
                    if (err) return reject(err);
                    resolve(new Quiz(this.lastID, title, category, difficulty, [], creator_id));
                }
            );
        });
    }

    static async addQuestion(quizId, questionData) {
        const { type, text, options, correctAnswer } = questionData;
        const optionsStr = options ? JSON.stringify(options) : null;

        return new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO questions (quiz_id, type, question_text, options, correct_answer) VALUES (?, ?, ?, ?, ?)',
                [quizId, type, text, optionsStr, correctAnswer],
                function (err) {
                    if (err) return reject(err);
                    resolve(this.lastID);
                }
            );
        });
    }

    static async updateStatus(id, status, is_public) {
        return new Promise((resolve, reject) => {
            db.run(
                'UPDATE quizzes SET status = ?, is_public = ? WHERE id = ?',
                [status, is_public, id],
                function (err) {
                    if (err) return reject(err);
                    resolve(this.changes);
                }
            );
        });
    }

    static async getById(id) {
        // Fetch quiz details
        const quizPromise = new Promise((resolve, reject) => {
            db.get('SELECT * FROM quizzes WHERE id = ?', [id], (err, row) => {
                if (err) return reject(err);
                resolve(row);
            });
        });

        // Fetch questions
        const questionsPromise = new Promise((resolve, reject) => {
            db.all('SELECT * FROM questions WHERE quiz_id = ?', [id], (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });

        const [quizData, questionsData] = await Promise.all([quizPromise, questionsPromise]);

        if (!quizData) return null;

        const questions = questionsData.map(q => {
            if (q.type === 'multiple_choice') {
                return new MultipleChoiceQuestion(q.id, q.question_text, JSON.parse(q.options), q.correct_answer);
            } else {
                return new TrueFalseQuestion(q.id, q.question_text, q.correct_answer);
            }
        });

        return new Quiz(
            quizData.id,
            quizData.title,
            quizData.category,
            quizData.difficulty,
            questions,
            quizData.creator_id,
            quizData.is_public,
            quizData.status,
            quizData.created_at
        );
    }

    static async getAll() {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT q.*, COUNT(qu.id) as questionCount 
                FROM quizzes q 
                LEFT JOIN questions qu ON q.id = qu.quiz_id 
                GROUP BY q.id
            `;
            db.all(query, [], (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });
    }

    static async getPublicQuizzes() {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT q.*, COUNT(qu.id) as questionCount 
                FROM quizzes q 
                LEFT JOIN questions qu ON q.id = qu.quiz_id 
                WHERE q.is_public = 1
                GROUP BY q.id
            `;
            db.all(query, [], (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });
    }

    static async getUserQuizzes(userId) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT q.*, COUNT(qu.id) as questionCount 
                FROM quizzes q 
                LEFT JOIN questions qu ON q.id = qu.quiz_id 
                WHERE q.creator_id = ?
                GROUP BY q.id
            `;
            db.all(query, [userId], (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });
    }
}

module.exports = Quiz;
