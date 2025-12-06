'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.createTable('notifications', {
                id: {
                    type: Sequelize.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                },
                user_id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    references: {
                        model: 'users',
                        key: 'id'
                    },
                    onDelete: 'CASCADE'
                },
                type: {
                    type: Sequelize.STRING(32), // 'challenge_invite', 'system', 'challenge_accepted', etc.
                    allowNull: false
                },
                title: {
                    type: Sequelize.STRING(255),
                    allowNull: false
                },
                message: {
                    type: Sequelize.TEXT,
                    allowNull: false
                },
                data: {
                    type: Sequelize.JSON,
                    allowNull: true
                },
                is_read: {
                    type: Sequelize.BOOLEAN,
                    defaultValue: false
                },
                created_at: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
                }
            }, { transaction });

            // Add index for user_id to speed up lookups
            await queryInterface.addIndex('notifications', ['user_id'], {
                transaction,
                name: 'idx_notifications_user_id'
            });

            // Add index for is_read to easily filter unread
            await queryInterface.addIndex('notifications', ['user_id', 'is_read'], {
                transaction,
                name: 'idx_notifications_user_unread'
            });

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('notifications');
    }
};
