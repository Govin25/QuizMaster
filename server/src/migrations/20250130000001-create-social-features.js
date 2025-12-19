'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Create user_follows table
        await queryInterface.createTable('user_follows', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            follower_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
                onDelete: 'CASCADE',
            },
            following_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
                onDelete: 'CASCADE',
            },
            created_at: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
        });

        // Add unique constraint (follower cannot follow same user twice)
        await queryInterface.addConstraint('user_follows', {
            fields: ['follower_id', 'following_id'],
            type: 'unique',
            name: 'user_follows_follower_following_unique',
        });

        // Add indexes for user_follows
        await queryInterface.addIndex('user_follows', ['follower_id'], {
            name: 'idx_user_follows_follower',
        });
        await queryInterface.addIndex('user_follows', ['following_id'], {
            name: 'idx_user_follows_following',
        });

        // Create quiz_likes table
        await queryInterface.createTable('quiz_likes', {
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
            quiz_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'quizzes',
                    key: 'id',
                },
                onDelete: 'CASCADE',
            },
            created_at: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
        });

        // Add unique constraint (user cannot like same quiz twice)
        await queryInterface.addConstraint('quiz_likes', {
            fields: ['user_id', 'quiz_id'],
            type: 'unique',
            name: 'quiz_likes_user_quiz_unique',
        });

        // Add indexes for quiz_likes
        await queryInterface.addIndex('quiz_likes', ['user_id'], {
            name: 'idx_quiz_likes_user',
        });
        await queryInterface.addIndex('quiz_likes', ['quiz_id'], {
            name: 'idx_quiz_likes_quiz',
        });
        await queryInterface.addIndex('quiz_likes', ['created_at'], {
            name: 'idx_quiz_likes_created_at',
        });

        // Create user_social_stats table
        await queryInterface.createTable('user_social_stats', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            user_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                unique: true,
                references: {
                    model: 'users',
                    key: 'id',
                },
                onDelete: 'CASCADE',
            },
            followers_count: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
            },
            following_count: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
            },
            total_likes_received: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
            },
            quizzes_created_count: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
            },
            updated_at: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
        });

        // Add index for user_social_stats
        await queryInterface.addIndex('user_social_stats', ['user_id'], {
            name: 'idx_user_social_stats_user',
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('user_social_stats');
        await queryInterface.dropTable('quiz_likes');
        await queryInterface.dropTable('user_follows');
    }
};
