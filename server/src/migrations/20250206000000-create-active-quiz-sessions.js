'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('active_quiz_sessions', {
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
            quiz_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'quizzes',
                    key: 'id'
                },
                onDelete: 'CASCADE'
            },
            challenge_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'challenges',
                    key: 'id'
                },
                onDelete: 'CASCADE'
            },
            session_token: {
                type: Sequelize.STRING(64),
                allowNull: false,
                unique: true
            },
            started_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            last_heartbeat: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });

        // Add indexes
        await queryInterface.addIndex('active_quiz_sessions', ['last_heartbeat'], {
            name: 'idx_last_heartbeat'
        });

        // Note: Partial unique indexes are not fully supported in SQLite via Sequelize migrations
        // The unique constraints for user_id+quiz_id and user_id+challenge_id will be enforced
        // at the application level
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('active_quiz_sessions');
    }
};
