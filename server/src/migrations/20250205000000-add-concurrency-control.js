'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const transaction = await queryInterface.sequelize.transaction();

        try {
            // Add version and updated_at columns to quizzes table
            await queryInterface.addColumn('quizzes', 'version', {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 1,
            }, { transaction });

            await queryInterface.addColumn('quizzes', 'updated_at', {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            }, { transaction });

            // Add version and updated_at columns to challenges table
            await queryInterface.addColumn('challenges', 'version', {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 1,
            }, { transaction });

            await queryInterface.addColumn('challenges', 'updated_at', {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            }, { transaction });

            // Create trigger to auto-increment version and update timestamp on quizzes UPDATE
            await queryInterface.sequelize.query(`
        CREATE TRIGGER IF NOT EXISTS update_quiz_version
        AFTER UPDATE ON quizzes
        FOR EACH ROW
        BEGIN
          UPDATE quizzes 
          SET version = OLD.version + 1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = NEW.id;
        END;
      `, { transaction });

            // Create trigger to auto-increment version and update timestamp on challenges UPDATE
            await queryInterface.sequelize.query(`
        CREATE TRIGGER IF NOT EXISTS update_challenge_version
        AFTER UPDATE ON challenges
        FOR EACH ROW
        BEGIN
          UPDATE challenges 
          SET version = OLD.version + 1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = NEW.id;
        END;
      `, { transaction });

            await transaction.commit();
            console.log('✓ Successfully added concurrency control columns and triggers');
        } catch (error) {
            await transaction.rollback();
            console.error('✗ Failed to add concurrency control:', error);
            throw error;
        }
    },

    down: async (queryInterface, Sequelize) => {
        const transaction = await queryInterface.sequelize.transaction();

        try {
            // Drop triggers first
            await queryInterface.sequelize.query(
                'DROP TRIGGER IF EXISTS update_quiz_version',
                { transaction }
            );

            await queryInterface.sequelize.query(
                'DROP TRIGGER IF EXISTS update_challenge_version',
                { transaction }
            );

            // Remove columns from quizzes table
            await queryInterface.removeColumn('quizzes', 'version', { transaction });
            await queryInterface.removeColumn('quizzes', 'updated_at', { transaction });

            // Remove columns from challenges table
            await queryInterface.removeColumn('challenges', 'version', { transaction });
            await queryInterface.removeColumn('challenges', 'updated_at', { transaction });

            await transaction.commit();
            console.log('✓ Successfully removed concurrency control columns and triggers');
        } catch (error) {
            await transaction.rollback();
            console.error('✗ Failed to remove concurrency control:', error);
            throw error;
        }
    }
};
