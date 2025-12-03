const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const UserPermission = sequelize.define('UserPermission', {
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            },
            onDelete: 'CASCADE'
        },
        permission_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'permissions',
                key: 'id'
            },
            onDelete: 'CASCADE'
        },
        granted: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            comment: 'true = whitelist (grant), false = blacklist (deny)'
        }
    }, {
        tableName: 'user_permissions',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false,
        indexes: [
            {
                unique: true,
                fields: ['user_id', 'permission_id']
            }
        ]
    });

    return UserPermission;
};
