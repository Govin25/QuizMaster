'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Get table description to check which columns exist
        const tableDescription = await queryInterface.describeTable('users');

        // Add missing columns only if they don't exist
        if (!tableDescription.terms_accepted_at) {
            await queryInterface.addColumn('users', 'terms_accepted_at', {
                type: Sequelize.DATE,
                allowNull: true,
            });
        }

        if (!tableDescription.privacy_accepted_at) {
            await queryInterface.addColumn('users', 'privacy_accepted_at', {
                type: Sequelize.DATE,
                allowNull: true,
            });
        }

        if (!tableDescription.account_deletion_requested_at) {
            await queryInterface.addColumn('users', 'account_deletion_requested_at', {
                type: Sequelize.DATE,
                allowNull: true,
            });
        }
    },

    async down(queryInterface, Sequelize) {
        // Remove the columns if we need to rollback
        await queryInterface.removeColumn('users', 'terms_accepted_at');
        await queryInterface.removeColumn('users', 'privacy_accepted_at');
        await queryInterface.removeColumn('users', 'account_deletion_requested_at');
    }
};
