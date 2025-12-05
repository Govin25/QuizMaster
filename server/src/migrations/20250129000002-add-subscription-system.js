'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            const tableInfo = await queryInterface.describeTable('users');

            // 1. Add subscription fields to users table if they don't exist
            if (!tableInfo.subscription_tier) {
                await queryInterface.addColumn('users', 'subscription_tier', {
                    type: Sequelize.STRING(20),
                    defaultValue: 'free',
                }, { transaction });
            }

            if (!tableInfo.subscription_status) {
                await queryInterface.addColumn('users', 'subscription_status', {
                    type: Sequelize.STRING(20),
                    defaultValue: 'active',
                }, { transaction });
            }

            if (!tableInfo.subscription_start_date) {
                await queryInterface.addColumn('users', 'subscription_start_date', {
                    type: Sequelize.DATE,
                    allowNull: true,
                }, { transaction });
            }

            if (!tableInfo.subscription_end_date) {
                await queryInterface.addColumn('users', 'subscription_end_date', {
                    type: Sequelize.DATE,
                    allowNull: true,
                }, { transaction });
            }

            if (!tableInfo.stripe_customer_id) {
                await queryInterface.addColumn('users', 'stripe_customer_id', {
                    type: Sequelize.STRING(255),
                    allowNull: true,
                }, { transaction });
            }

            if (!tableInfo.stripe_subscription_id) {
                await queryInterface.addColumn('users', 'stripe_subscription_id', {
                    type: Sequelize.STRING(255),
                    allowNull: true,
                }, { transaction });
            }

            // 2. Create user_usage table if it doesn't exist
            // SQLite doesn't support 'IF NOT EXISTS' in createTable via Sequelize consistently across versions,
            // but we can check existence or just try-catch.
            // Better to check existence if possible, but Sequelize doesn't have a simple 'tableExists' in QueryInterface that is universal?
            // actually showAllTables or just catch the error.

            try {
                await queryInterface.createTable('user_usage', {
                    id: {
                        type: Sequelize.INTEGER,
                        primaryKey: true,
                        autoIncrement: true,
                    },
                    user_id: {
                        type: Sequelize.INTEGER,
                        allowNull: false,
                        references: {
                            model: 'users',
                            key: 'id',
                        },
                        onDelete: 'CASCADE',
                    },
                    month: {
                        type: Sequelize.STRING(7),
                        allowNull: false,
                    },
                    ai_quiz_count: {
                        type: Sequelize.INTEGER,
                        defaultValue: 0,
                    },
                    document_quiz_count: {
                        type: Sequelize.INTEGER,
                        defaultValue: 0,
                    },
                    video_quiz_count: {
                        type: Sequelize.INTEGER,
                        defaultValue: 0,
                    },
                    created_at: {
                        type: Sequelize.DATE,
                        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
                    },
                    updated_at: {
                        type: Sequelize.DATE,
                        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
                    },
                }, { transaction });

                // 3. Create index for user_usage immediately after creating table
                await queryInterface.addIndex('user_usage', ['user_id', 'month'], {
                    unique: true,
                    name: 'idx_user_usage_user_month',
                    transaction,
                });
            } catch (err) {
                // Ignore if table exists
                if (!err.message.includes('already exists')) {
                    throw err;
                }
            }

            // 4. Create subscription_history table
            try {
                await queryInterface.createTable('subscription_history', {
                    id: {
                        type: Sequelize.INTEGER,
                        primaryKey: true,
                        autoIncrement: true,
                    },
                    user_id: {
                        type: Sequelize.INTEGER,
                        allowNull: false,
                        references: {
                            model: 'users',
                            key: 'id',
                        },
                        onDelete: 'CASCADE',
                    },
                    from_tier: {
                        type: Sequelize.STRING(20),
                        allowNull: true,
                    },
                    to_tier: {
                        type: Sequelize.STRING(20),
                        allowNull: true,
                    },
                    changed_at: {
                        type: Sequelize.DATE,
                        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
                    },
                    reason: {
                        type: Sequelize.STRING(255),
                        allowNull: true,
                    },
                }, { transaction });
            } catch (err) {
                if (!err.message.includes('already exists')) {
                    throw err;
                }
            }

            // 5. Initialize existing users with free tier
            await queryInterface.sequelize.query(`
        UPDATE users 
        SET subscription_tier = 'free', 
            subscription_status = 'active',
            subscription_start_date = CURRENT_TIMESTAMP
        WHERE subscription_tier IS NULL OR subscription_tier = ''
      `, { transaction });

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    async down(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            // Drop tables
            await queryInterface.dropTable('subscription_history', { transaction });
            await queryInterface.dropTable('user_usage', { transaction });

            // Remove columns from users
            await queryInterface.removeColumn('users', 'stripe_subscription_id', { transaction });
            await queryInterface.removeColumn('users', 'stripe_customer_id', { transaction });
            await queryInterface.removeColumn('users', 'subscription_end_date', { transaction });
            await queryInterface.removeColumn('users', 'subscription_start_date', { transaction });
            await queryInterface.removeColumn('users', 'subscription_status', { transaction });
            await queryInterface.removeColumn('users', 'subscription_tier', { transaction });

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
};
