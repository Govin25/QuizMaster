const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Question = sequelize.define('Question', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        quiz_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'quizzes',
                key: 'id',
            },
        },
        type: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        question_text: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        options: {
            type: DataTypes.TEXT,
            allowNull: true,
            get() {
                const rawValue = this.getDataValue('options');
                return rawValue ? JSON.parse(rawValue) : null;
            },
            set(value) {
                this.setDataValue('options', value ? JSON.stringify(value) : null);
            },
        },
        correct_answer: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    }, {
        tableName: 'questions',
        timestamps: false,
    });

    return Question;
};
