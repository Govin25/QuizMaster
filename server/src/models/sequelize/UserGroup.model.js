const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const UserGroup = sequelize.define('UserGroup', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        tableName: 'user_groups',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return UserGroup;
};
