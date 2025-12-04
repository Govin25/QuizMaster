const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ActiveQuizSession = sequelize.define('ActiveQuizSession', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            },
            onDelete: 'CASCADE'
        },
        quiz_id: {
            type: DataTypes.INTEGER,
            allowNull: true,  // Nullable when it's a challenge session
            references: {
                model: 'quizzes',
                key: 'id'
            },
            onDelete: 'CASCADE'
        },
        challenge_id: {
            type: DataTypes.INTEGER,
            allowNull: true,  // Nullable when it's a quiz session
            references: {
                model: 'challenges',
                key: 'id'
            },
            onDelete: 'CASCADE'
        },
        session_token: {
            type: DataTypes.STRING(64),
            allowNull: false,
            unique: true
        },
        started_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        last_heartbeat: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
    }, {
        tableName: 'active_quiz_sessions',
        timestamps: false,
        indexes: [
            {
                unique: true,
                fields: ['user_id', 'quiz_id'],
                name: 'unique_user_quiz_session',
                where: { quiz_id: { [sequelize.Sequelize.Op.ne]: null }, challenge_id: null }
            },
            {
                unique: true,
                fields: ['user_id', 'challenge_id'],
                name: 'unique_user_challenge_session',
                where: { challenge_id: { [sequelize.Sequelize.Op.ne]: null }, quiz_id: null }
            },
            {
                fields: ['last_heartbeat'],
                name: 'idx_last_heartbeat'
            }
        ]
    });

    return ActiveQuizSession;
};
