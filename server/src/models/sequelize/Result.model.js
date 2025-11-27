const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Result = sequelize.define('Result', {
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
        score: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        completed_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    }, {
        tableName: 'results',
        timestamps: false,
    });

    return Result;
};
