module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.sequelize.query(`
            ALTER TABLE group_challenge_participants 
            ADD COLUMN total_time INTEGER DEFAULT 0;
        `);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.sequelize.query(`
            ALTER TABLE group_challenge_participants 
            DROP COLUMN total_time;
        `);
    }
};
