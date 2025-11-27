const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const UserAchievement = sequelize.define('UserAchievement', {
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
        achievement_id: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        unlocked_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    }, {
        tableName: 'user_achievements',
        timestamps: false,
        indexes: [
            {
                unique: true,
                fields: ['user_id', 'achievement_id'],
            },
        ],
    });

    return UserAchievement;
};
