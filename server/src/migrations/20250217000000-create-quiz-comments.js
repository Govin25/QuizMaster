'use strict';

/**
 * Migration: Quiz Comments Feature
 * Creates tables for quiz comments, ratings, and upvotes
 */

module.exports = {
    async up(queryInterface, Sequelize) {
        // Create quiz_comments table
        await queryInterface.createTable('quiz_comments', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
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
            user_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
                onDelete: 'CASCADE',
            },
            content: {
                type: Sequelize.TEXT,
                allowNull: false,
            },
            rating: {
                type: Sequelize.INTEGER,
                allowNull: true,
                validate: {
                    min: 1,
                    max: 5,
                },
            },
            upvotes: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            is_pinned: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            is_flagged: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            is_hidden: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            flag_reason: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            parent_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'quiz_comments',
                    key: 'id',
                },
                onDelete: 'CASCADE',
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
        });

        // Create quiz_comment_upvotes table
        await queryInterface.createTable('quiz_comment_upvotes', {
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
            comment_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'quiz_comments',
                    key: 'id',
                },
                onDelete: 'CASCADE',
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
        });

        // Create indexes for performance
        await queryInterface.addIndex('quiz_comments', ['quiz_id'], {
            name: 'idx_quiz_comments_quiz',
        });
        await queryInterface.addIndex('quiz_comments', ['user_id'], {
            name: 'idx_quiz_comments_user',
        });
        await queryInterface.addIndex('quiz_comments', ['parent_id'], {
            name: 'idx_quiz_comments_parent',
        });
        await queryInterface.addIndex('quiz_comments', ['is_pinned'], {
            name: 'idx_quiz_comments_pinned',
        });
        await queryInterface.addIndex('quiz_comments', ['is_flagged'], {
            name: 'idx_quiz_comments_flagged',
        });
        await queryInterface.addIndex('quiz_comments', ['created_at'], {
            name: 'idx_quiz_comments_created',
        });

        await queryInterface.addIndex('quiz_comment_upvotes', ['user_id', 'comment_id'], {
            unique: true,
            name: 'idx_comment_upvotes_unique',
        });
        await queryInterface.addIndex('quiz_comment_upvotes', ['comment_id'], {
            name: 'idx_comment_upvotes_comment',
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('quiz_comment_upvotes');
        await queryInterface.dropTable('quiz_comments');
    },
};
