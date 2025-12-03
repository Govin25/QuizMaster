const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const GroupMember = sequelize.define('GroupMember', {
        group_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'user_groups',
                key: 'id'
            },
            onDelete: 'CASCADE'
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            },
            onDelete: 'CASCADE'
        }
    }, {
        tableName: 'group_members',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false,
        indexes: [
            {
                unique: true,
                fields: ['group_id', 'user_id']
            }
        ]
    });

    return GroupMember;
};
