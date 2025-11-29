'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Phase 1: Create users table (no dependencies)
        await queryInterface.createTable('users', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            username: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true,
            },
            password: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            created_at: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            role: {
                type: Sequelize.STRING,
                defaultValue: 'user',
            },
            level: {
                type: Sequelize.INTEGER,
                defaultValue: 1,
            },
            xp: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
            },
            avatar_url: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            terms_accepted_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
            privacy_accepted_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
            account_deletion_requested_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
        });

        // Phase 2: Create quizzes table (depends on users)
        await queryInterface.createTable('quizzes', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            title: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            category: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            difficulty: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            creator_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id',
                },
            },
            is_public: {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
            },
            status: {
                type: Sequelize.STRING,
                defaultValue: 'draft',
            },
            created_at: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            source: {
                type: Sequelize.STRING,
                defaultValue: 'manual',
            },
        });

        // Add indexes for quizzes
        await queryInterface.addIndex('quizzes', ['creator_id'], {
            name: 'idx_quizzes_creator_id',
        });
        await queryInterface.addIndex('quizzes', ['is_public', 'status'], {
            name: 'idx_quizzes_public_status',
        });

        // Phase 3: Create questions table (depends on quizzes)
        await queryInterface.createTable('questions', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            quiz_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'quizzes',
                    key: 'id',
                },
            },
            type: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            question_text: {
                type: Sequelize.TEXT,
                allowNull: false,
            },
            options: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            correct_answer: {
                type: Sequelize.TEXT,
                allowNull: false,
            },
        });

        // Add index for questions
        await queryInterface.addIndex('questions', ['quiz_id'], {
            name: 'idx_questions_quiz_id',
        });

        // Phase 4: Create results table (depends on users and quizzes)
        await queryInterface.createTable('results', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            user_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id',
                },
            },
            quiz_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'quizzes',
                    key: 'id',
                },
            },
            score: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            completed_at: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
        });

        // Add indexes for results
        await queryInterface.addIndex('results', ['user_id'], {
            name: 'idx_results_user_id',
        });
        await queryInterface.addIndex('results', ['quiz_id'], {
            name: 'idx_results_quiz_id',
        });
        await queryInterface.addIndex('results', ['completed_at'], {
            name: 'idx_results_completed_at',
        });
        await queryInterface.addIndex('results', ['user_id', 'quiz_id'], {
            name: 'idx_results_user_quiz',
        });
        await queryInterface.addIndex('results', ['quiz_id', 'score'], {
            name: 'idx_results_quiz_score',
        });

        // Phase 5: Create question_attempts table (depends on users, quizzes, questions, results)
        await queryInterface.createTable('question_attempts', {
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
            },
            quiz_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'quizzes',
                    key: 'id',
                },
            },
            question_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'questions',
                    key: 'id',
                },
            },
            result_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'results',
                    key: 'id',
                },
            },
            user_answer: {
                type: Sequelize.TEXT,
                allowNull: false,
            },
            is_correct: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
            },
            time_taken_seconds: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            attempted_at: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
        });

        // Add indexes for question_attempts
        await queryInterface.addIndex('question_attempts', ['user_id'], {
            name: 'idx_question_attempts_user_id',
        });
        await queryInterface.addIndex('question_attempts', ['quiz_id'], {
            name: 'idx_question_attempts_quiz_id',
        });
        await queryInterface.addIndex('question_attempts', ['result_id'], {
            name: 'idx_question_attempts_result_id',
        });
        await queryInterface.addIndex('question_attempts', ['result_id', 'is_correct'], {
            name: 'idx_question_attempts_result_correct',
        });

        // Phase 6: Create feature tables

        // quiz_reviews table
        await queryInterface.createTable('quiz_reviews', {
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
            },
            reviewer_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id',
                },
            },
            status: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            comments: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            reviewed_at: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
        });

        await queryInterface.addIndex('quiz_reviews', ['quiz_id'], {
            name: 'idx_quiz_reviews_quiz_id',
        });

        // user_quiz_library table
        await queryInterface.createTable('user_quiz_library', {
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
            },
            quiz_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'quizzes',
                    key: 'id',
                },
            },
            added_at: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
        });

        // Add unique constraint and indexes for user_quiz_library
        await queryInterface.addConstraint('user_quiz_library', {
            fields: ['user_id', 'quiz_id'],
            type: 'unique',
            name: 'user_quiz_library_user_id_quiz_id_unique',
        });
        await queryInterface.addIndex('user_quiz_library', ['user_id'], {
            name: 'idx_user_quiz_library_user_id',
        });
        await queryInterface.addIndex('user_quiz_library', ['quiz_id'], {
            name: 'idx_user_quiz_library_quiz_id',
        });

        // user_achievements table
        await queryInterface.createTable('user_achievements', {
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
            },
            achievement_id: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            unlocked_at: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
        });

        // Add unique constraint and index for user_achievements
        await queryInterface.addConstraint('user_achievements', {
            fields: ['user_id', 'achievement_id'],
            type: 'unique',
            name: 'user_achievements_user_id_achievement_id_unique',
        });
        await queryInterface.addIndex('user_achievements', ['user_id'], {
            name: 'idx_user_achievements_user_id',
        });

        // user_stats table
        await queryInterface.createTable('user_stats', {
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
            },
            total_quizzes: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
            },
            total_score: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
            },
            best_score: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
            },
            current_streak: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
            },
            longest_streak: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
            },
            last_active_date: {
                type: Sequelize.DATEONLY,
                allowNull: true,
            },
            total_time_seconds: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
            },
        });

        await queryInterface.addIndex('user_stats', ['user_id'], {
            name: 'idx_user_stats_user_id',
        });
    },

    async down(queryInterface, Sequelize) {
        // Drop tables in reverse order to respect foreign key constraints
        await queryInterface.dropTable('user_stats');
        await queryInterface.dropTable('user_achievements');
        await queryInterface.dropTable('user_quiz_library');
        await queryInterface.dropTable('quiz_reviews');
        await queryInterface.dropTable('question_attempts');
        await queryInterface.dropTable('results');
        await queryInterface.dropTable('questions');
        await queryInterface.dropTable('quizzes');
        await queryInterface.dropTable('users');
    }
};
