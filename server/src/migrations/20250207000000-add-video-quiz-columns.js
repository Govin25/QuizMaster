'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Add video quiz columns to quizzes table
        const table = await queryInterface.describeTable('quizzes');

        if (!table.video_url) {
            await queryInterface.addColumn('quizzes', 'video_url', {
                type: Sequelize.TEXT,
                allowNull: true,
            });
        }

        if (!table.video_platform) {
            await queryInterface.addColumn('quizzes', 'video_platform', {
                type: Sequelize.STRING,
                allowNull: true,
            });
        }

        if (!table.video_id) {
            await queryInterface.addColumn('quizzes', 'video_id', {
                type: Sequelize.STRING,
                allowNull: true,
            });
        }

        if (!table.video_title) {
            await queryInterface.addColumn('quizzes', 'video_title', {
                type: Sequelize.TEXT,
                allowNull: true,
            });
        }

        if (!table.video_duration) {
            await queryInterface.addColumn('quizzes', 'video_duration', {
                type: Sequelize.INTEGER,
                allowNull: true,
            });
        }

        if (!table.video_thumbnail) {
            await queryInterface.addColumn('quizzes', 'video_thumbnail', {
                type: Sequelize.TEXT,
                allowNull: true,
            });
        }

        console.log('✓ Successfully added video quiz columns to quizzes table');
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('quizzes', 'video_url');
        await queryInterface.removeColumn('quizzes', 'video_platform');
        await queryInterface.removeColumn('quizzes', 'video_id');
        await queryInterface.removeColumn('quizzes', 'video_title');
        await queryInterface.removeColumn('quizzes', 'video_duration');
        await queryInterface.removeColumn('quizzes', 'video_thumbnail');

        console.log('✓ Successfully removed video quiz columns from quizzes table');
    }
};
