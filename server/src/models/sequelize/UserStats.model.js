const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const UserStats = sequelize.define('UserStats', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        total_quizzes: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        total_score: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        best_score: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        current_streak: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        longest_streak: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        last_active_date: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        total_time_seconds: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
    }, {
        tableName: 'user_stats',
        timestamps: false,
    });

    return UserStats;
};
