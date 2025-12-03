const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Permission = sequelize.define('Permission', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
            comment: 'Permission identifier in format resource:action'
        },
        resource: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: 'Resource type (quiz, challenge, user, etc.)'
        },
        action: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: 'Action type (create, edit, delete, etc.)'
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        tableName: 'permissions',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false,
        indexes: [
            {
                fields: ['resource', 'action']
            }
        ]
    });

    return Permission;
};
