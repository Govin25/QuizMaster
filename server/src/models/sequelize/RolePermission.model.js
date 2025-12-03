const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const RolePermission = sequelize.define('RolePermission', {
        role_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'roles',
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
        }
    }, {
        tableName: 'role_permissions',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false,
        indexes: [
            {
                unique: true,
                fields: ['role_id', 'permission_id']
            }
        ]
    });

    return RolePermission;
};
