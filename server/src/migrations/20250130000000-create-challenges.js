'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Create challenges table (1v1 challenges)
        await queryInterface.createTable('challenges', {
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
            creator_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
            },
            opponent_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
            },
            status: {
                type: Sequelize.STRING,
                defaultValue: 'pending',
            },
            winner_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id',
                },
            },
            created_at: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            started_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
            completed_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
            parent_challenge_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'challenges',
                    key: 'id',
                },
            },
            is_rematch: {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
            },
            version: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 1,
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
        });

        // Add indexes for challenges
        await queryInterface.addIndex('challenges', ['creator_id'], {
            name: 'idx_challenges_creator_id',
        });
        await queryInterface.addIndex('challenges', ['opponent_id'], {
            name: 'idx_challenges_opponent_id',
        });
        await queryInterface.addIndex('challenges', ['quiz_id'], {
            name: 'idx_challenges_quiz_id',
        });
        await queryInterface.addIndex('challenges', ['status'], {
            name: 'idx_challenges_status',
        });

        // Create challenge_participants table
        await queryInterface.createTable('challenge_participants', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            challenge_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'challenges',
                    key: 'id',
                },
            },
            user_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
            },
            score: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
            },
            total_time_seconds: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
            },
            completed: {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
            },
            completed_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
            result_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'results',
                    key: 'id',
                },
            },
        });

        // Add indexes for challenge_participants
        await queryInterface.addIndex('challenge_participants', ['challenge_id'], {
            name: 'idx_challenge_participants_challenge_id',
        });
        await queryInterface.addIndex('challenge_participants', ['user_id'], {
            name: 'idx_challenge_participants_user_id',
        });

        // Create challenge_stats table
        await queryInterface.createTable('challenge_stats', {
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
            total_challenges: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
            },
            challenges_won: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
            },
            challenges_lost: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
            },
            challenges_drawn: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
            },
            current_win_streak: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
            },
            best_win_streak: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
            },
        });

        // Add index for challenge_stats
        await queryInterface.addIndex('challenge_stats', ['user_id'], {
            name: 'idx_challenge_stats_user_id',
        });

        // Create trigger for challenge version update (SQLite specific)
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
        `);
    },

    async down(queryInterface, Sequelize) {
        // Drop trigger first
        await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS update_challenge_version;');

        // Drop tables in reverse order
        await queryInterface.dropTable('challenge_stats');
        await queryInterface.dropTable('challenge_participants');
        await queryInterface.dropTable('challenges');
    }
};
