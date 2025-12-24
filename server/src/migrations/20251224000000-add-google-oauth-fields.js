'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Add google_id column (without UNIQUE constraint initially for SQLite)
        await queryInterface.addColumn('users', 'google_id', {
            type: Sequelize.STRING(255),
            allowNull: true
        });

        // Add unique index separately (SQLite-compatible)
        await queryInterface.addIndex('users', ['google_id'], {
            unique: true,
            name: 'users_google_id_unique',
            where: {
                google_id: { [Sequelize.Op.ne]: null }
            }
        });

        // Add auth_provider column
        await queryInterface.addColumn('users', 'auth_provider', {
            type: Sequelize.STRING(20),
            allowNull: false,
            defaultValue: 'local'
        });
    },

    async down(queryInterface, Sequelize) {
        // Remove index first
        await queryInterface.removeIndex('users', 'users_google_id_unique');

        // Remove auth_provider column
        await queryInterface.removeColumn('users', 'auth_provider');

        // Remove google_id column
        await queryInterface.removeColumn('users', 'google_id');
    }
};
