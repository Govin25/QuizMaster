const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const UserQuizLibrary = sequelize.define('UserQuizLibrary', {
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
        added_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    }, {
        tableName: 'user_quiz_library',
        timestamps: false,
        indexes: [
            {
                unique: true,
                fields: ['user_id', 'quiz_id'],
            },
        ],
    });

    return UserQuizLibrary;
};
