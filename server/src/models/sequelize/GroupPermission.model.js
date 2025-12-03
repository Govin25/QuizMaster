const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const GroupPermission = sequelize.define('GroupPermission', {
        group_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'user_groups',
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
        tableName: 'group_permissions',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false,
        indexes: [
            {
                unique: true,
                fields: ['group_id', 'permission_id']
            }
        ]
    });

    return GroupPermission;
};
