'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const transaction = await queryInterface.sequelize.transaction();

        try {
            // Create group_challenges table
            await queryInterface.createTable('group_challenges', {
                id: {
                    type: Sequelize.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                },
                quiz_id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    references: {
                        model: 'quizzes',
                        key: 'id'
                    },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE'
                },
                leader_id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    references: {
                        model: 'users',
                        key: 'id'
                    },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE'
                },
                room_code: {
                    type: Sequelize.STRING(6),
                    allowNull: false,
                    unique: true
                },
                status: {
                    type: Sequelize.STRING(20),
                    allowNull: false,
                    defaultValue: 'waiting' // waiting, active, completed
                },
                max_participants: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    defaultValue: 8
                },
                created_at: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
                },
                started_at: {
                    type: Sequelize.DATE,
                    allowNull: true
                },
                completed_at: {
                    type: Sequelize.DATE,
                    allowNull: true
                },
                version: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    defaultValue: 1
                },
                updated_at: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
                }
            }, { transaction });

            // Create group_challenge_participants table
            await queryInterface.createTable('group_challenge_participants', {
                id: {
                    type: Sequelize.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                },
                group_challenge_id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    references: {
                        model: 'group_challenges',
                        key: 'id'
                    },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE'
                },
                user_id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    references: {
                        model: 'users',
                        key: 'id'
                    },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE'
                },
                score: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    defaultValue: 0
                },
                total_time_seconds: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    defaultValue: 0
                },
                rank: {
                    type: Sequelize.INTEGER,
                    allowNull: true
                },
                is_ready: {
                    type: Sequelize.BOOLEAN,
                    allowNull: false,
                    defaultValue: false
                },
                completed: {
                    type: Sequelize.BOOLEAN,
                    allowNull: false,
                    defaultValue: false
                },
                completed_at: {
                    type: Sequelize.DATE,
                    allowNull: true
                },
                joined_at: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
                }
            }, { transaction });

            // Create group_challenge_stats table
            await queryInterface.createTable('group_challenge_stats', {
                id: {
                    type: Sequelize.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                },
                user_id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    unique: true,
                    references: {
                        model: 'users',
                        key: 'id'
                    },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE'
                },
                total_group_challenges: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    defaultValue: 0
                },
                first_place_finishes: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    defaultValue: 0
                },
                second_place_finishes: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    defaultValue: 0
                },
                third_place_finishes: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    defaultValue: 0
                },
                best_rank: {
                    type: Sequelize.INTEGER,
                    allowNull: true
                },
                average_rank: {
                    type: Sequelize.FLOAT,
                    allowNull: true
                },
                total_score: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    defaultValue: 0
                },
                created_at: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
                },
                updated_at: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
                }
            }, { transaction });

            // Create indexes for performance
            await queryInterface.addIndex('group_challenges', ['leader_id'], {
                name: 'idx_group_challenges_leader_id',
                transaction
            });

            await queryInterface.addIndex('group_challenges', ['quiz_id'], {
                name: 'idx_group_challenges_quiz_id',
                transaction
            });

            await queryInterface.addIndex('group_challenges', ['status'], {
                name: 'idx_group_challenges_status',
                transaction
            });

            await queryInterface.addIndex('group_challenges', ['room_code'], {
                name: 'idx_group_challenges_room_code',
                unique: true,
                transaction
            });

            await queryInterface.addIndex('group_challenge_participants', ['group_challenge_id'], {
                name: 'idx_group_challenge_participants_challenge_id',
                transaction
            });

            await queryInterface.addIndex('group_challenge_participants', ['user_id'], {
                name: 'idx_group_challenge_participants_user_id',
                transaction
            });

            await queryInterface.addIndex('group_challenge_participants', ['group_challenge_id', 'user_id'], {
                name: 'idx_group_challenge_participants_challenge_user',
                unique: true,
                transaction
            });

            await queryInterface.addIndex('group_challenge_stats', ['user_id'], {
                name: 'idx_group_challenge_stats_user_id',
                unique: true,
                transaction
            });

            // Create trigger for auto-incrementing version on update (SQLite)
            await queryInterface.sequelize.query(`
        CREATE TRIGGER IF NOT EXISTS group_challenges_version_update
        AFTER UPDATE ON group_challenges
        FOR EACH ROW
        BEGIN
          UPDATE group_challenges 
          SET version = version + 1, updated_at = CURRENT_TIMESTAMP
          WHERE id = NEW.id;
        END;
      `, { transaction });

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    down: async (queryInterface, Sequelize) => {
        const transaction = await queryInterface.sequelize.transaction();

        try {
            // Drop trigger
            await queryInterface.sequelize.query(
                'DROP TRIGGER IF EXISTS group_challenges_version_update',
                { transaction }
            );

            // Drop tables in reverse order (due to foreign keys)
            await queryInterface.dropTable('group_challenge_stats', { transaction });
            await queryInterface.dropTable('group_challenge_participants', { transaction });
            await queryInterface.dropTable('group_challenges', { transaction });

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
};
