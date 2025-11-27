const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const QuestionAttempt = sequelize.define('QuestionAttempt', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        quiz_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'quizzes',
                key: 'id',
            },
        },
        question_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'questions',
                key: 'id',
            },
        },
        result_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'results',
                key: 'id',
            },
        },
        user_answer: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        is_correct: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
        },
        time_taken_seconds: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        attempted_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    }, {
        tableName: 'question_attempts',
        timestamps: false,
    });

    return QuestionAttempt;
};
