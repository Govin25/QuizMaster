'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Add email column to users table
        await queryInterface.addColumn('users', 'email', {
            type: Sequelize.STRING(255),
            allowNull: false,
            unique: true
        });

        // Add name column to users table
        await queryInterface.addColumn('users', 'name', {
            type: Sequelize.STRING(100),
            allowNull: true
        });

        // Add index on email for fast lookups
        await queryInterface.addIndex('users', ['email'], {
            name: 'idx_users_email',
            unique: true
        });
    },

    async down(queryInterface, Sequelize) {
        // Remove index first
        await queryInterface.removeIndex('users', 'idx_users_email');

        // Remove columns
        await queryInterface.removeColumn('users', 'email');
        await queryInterface.removeColumn('users', 'name');
    }
};
