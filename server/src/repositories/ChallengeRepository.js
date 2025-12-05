const db = require('../db');
const logger = require('../utils/logger');

class ChallengeRepository {
    /**
     * Create a new challenge
     */
    static async createChallenge(quizId, creatorId, opponentId) {
        return new Promise((resolve, reject) => {
            const query = `
        INSERT INTO challenges (quiz_id, creator_id, opponent_id, status)
        VALUES (?, ?, ?, 'pending')
      `;

            db.run(query, [quizId, creatorId, opponentId], function (err) {
                if (err) {
                    logger.error('Failed to create challenge', { error: err, quizId, creatorId, opponentId });
                    return reject(err);
                }

                const challengeId = this.lastID;

                // Create participant records for both users
                const participantQuery = `
          INSERT INTO challenge_participants (challenge_id, user_id)
          VALUES (?, ?), (?, ?)
        `;

                db.run(participantQuery, [challengeId, creatorId, challengeId, opponentId], (err) => {
                    if (err) {
                        logger.error('Failed to create challenge participants', { error: err, challengeId });
                        return reject(err);
                    }

                    logger.info('Challenge created successfully', { challengeId, quizId, creatorId, opponentId });
                    resolve(challengeId);
                });
            });
        });
    }

    /**
     * Get challenge by ID with full details
     */
    static async getChallengeById(challengeId) {
        return new Promise((resolve, reject) => {
            const query = `
        SELECT 
          c.*,
          q.title as quiz_title,
          q.category as quiz_category,
          q.difficulty as quiz_difficulty,
          creator.username as creator_username,
          opponent.username as opponent_username,
          winner.username as winner_username,
          cp1.score as creator_score,
          cp1.total_time_seconds as creator_time,
          cp1.completed as creator_completed,
          cp1.completed_at as creator_completed_at,
          cp2.score as opponent_score,
          cp2.total_time_seconds as opponent_time,
          cp2.completed as opponent_completed,
          cp2.completed_at as opponent_completed_at
        FROM challenges c
        JOIN quizzes q ON c.quiz_id = q.id
        JOIN users creator ON c.creator_id = creator.id
        JOIN users opponent ON c.opponent_id = opponent.id
        LEFT JOIN users winner ON c.winner_id = winner.id
        LEFT JOIN challenge_participants cp1 ON c.id = cp1.challenge_id AND cp1.user_id = c.creator_id
        LEFT JOIN challenge_participants cp2 ON c.id = cp2.challenge_id AND cp2.user_id = c.opponent_id
        WHERE c.id = ?
      `;

            db.get(query, [challengeId], (err, row) => {
                if (err) {
                    logger.error('Failed to get challenge', { error: err, challengeId });
                    return reject(err);
                }
                resolve(row);
            });
        });
    }

    /**
     * Get user's challenges with filters
     */
    static async getUserChallenges(userId, filters = {}) {
        return new Promise((resolve, reject) => {
            let query = `
        SELECT 
          c.*,
          q.title as quiz_title,
          q.category as quiz_category,
          q.difficulty as quiz_difficulty,
          creator.username as creator_username,
          opponent.username as opponent_username,
          cp_user.score as my_score,
          cp_user.completed as my_completed,
          cp_opponent.score as opponent_score,
          cp_opponent.completed as opponent_completed
        FROM challenges c
        JOIN quizzes q ON c.quiz_id = q.id
        JOIN users creator ON c.creator_id = creator.id
        JOIN users opponent ON c.opponent_id = opponent.id
        LEFT JOIN challenge_participants cp_user ON c.id = cp_user.challenge_id AND cp_user.user_id = ?
        LEFT JOIN challenge_participants cp_opponent ON c.id = cp_opponent.challenge_id AND cp_opponent.user_id != ?
        WHERE (c.creator_id = ? OR c.opponent_id = ?)
      `;

            const params = [userId, userId, userId, userId];


            // Apply status filter
            if (filters.status) {
                query += ` AND c.status = ?`;
                params.push(filters.status);
            } else {
                // By default, exclude declined and cancelled challenges
                query += ` AND c.status NOT IN ('declined', 'cancelled')`;
            }

            // Apply type filter (sent/received)
            if (filters.type === 'sent') {
                query += ` AND c.creator_id = ?`;
                params.push(userId);
            } else if (filters.type === 'received') {
                query += ` AND c.opponent_id = ?`;
                params.push(userId);
            }

            query += ` ORDER BY c.created_at DESC`;

            // Apply limit
            if (filters.limit) {
                query += ` LIMIT ?`;
                params.push(filters.limit);
            }

            db.all(query, params, (err, rows) => {
                if (err) {
                    logger.error('Failed to get user challenges', { error: err, userId, filters });
                    return reject(err);
                }
                resolve(rows || []);
            });
        });
    }

    /**
     * Update challenge status
     */
    static async updateChallengeStatus(challengeId, status, additionalFields = {}, expectedVersion = null) {
        const ConcurrencyError = require('../utils/ConcurrencyError');

        // If version checking is enabled, validate version first
        if (expectedVersion !== null) {
            const currentChallenge = await this.getChallengeById(challengeId);
            if (!currentChallenge) {
                throw new Error('Challenge not found');
            }

            if (currentChallenge.version !== expectedVersion) {
                throw new ConcurrencyError(
                    `Challenge has been modified by another session. Expected version ${expectedVersion}, but current version is ${currentChallenge.version}.`,
                    'challenge',
                    expectedVersion,
                    currentChallenge.version
                );
            }
        }
        return new Promise((resolve, reject) => {
            let updates = ['status = ?'];
            let params = [status];

            if (status === 'active' && !additionalFields.started_at) {
                updates.push('started_at = CURRENT_TIMESTAMP');
            }

            if (status === 'completed' && !additionalFields.completed_at) {
                updates.push('completed_at = CURRENT_TIMESTAMP');
            }

            Object.keys(additionalFields).forEach(key => {
                updates.push(`${key} = ?`);
                params.push(additionalFields[key]);
            });

            params.push(challengeId);

            const query = `UPDATE challenges SET ${updates.join(', ')} WHERE id = ?`;

            db.run(query, params, function (err) {
                if (err) {
                    logger.error('Failed to update challenge status', { error: err, challengeId, status });
                    return reject(err);
                }
                resolve(this.changes > 0);
            });
        });
    }

    /**
     * Update participant score and time
     */
    static async updateParticipantScore(challengeId, userId, score, timeTaken, resultId = null, expectedVersion = null) {
        const ConcurrencyError = require('../utils/ConcurrencyError');

        // If version checking is enabled, validate version first
        if (expectedVersion !== null) {
            const currentChallenge = await this.getChallengeById(challengeId);
            if (!currentChallenge) {
                throw new Error('Challenge not found');
            }

            if (currentChallenge.version !== expectedVersion) {
                throw new ConcurrencyError(
                    `Challenge has been modified by another session. Expected version ${expectedVersion}, but current version is ${currentChallenge.version}.`,
                    'challenge',
                    expectedVersion,
                    currentChallenge.version
                );
            }
        }
        return new Promise((resolve, reject) => {
            const query = `
        UPDATE challenge_participants 
        SET score = ?, total_time_seconds = ?, result_id = ?
        WHERE challenge_id = ? AND user_id = ?
      `;

            db.run(query, [score, timeTaken, resultId, challengeId, userId], function (err) {
                if (err) {
                    logger.error('Failed to update participant score', { error: err, challengeId, userId });
                    return reject(err);
                }
                resolve(this.changes > 0);
            });
        });
    }

    /**
     * Mark participant as completed
     */
    static async markParticipantCompleted(challengeId, userId) {
        return new Promise((resolve, reject) => {
            const query = `
        UPDATE challenge_participants 
        SET completed = 1, completed_at = CURRENT_TIMESTAMP
        WHERE challenge_id = ? AND user_id = ?
      `;

            db.run(query, [challengeId, userId], function (err) {
                if (err) {
                    logger.error('Failed to mark participant completed', { error: err, challengeId, userId });
                    return reject(err);
                }
                resolve(this.changes > 0);
            });
        });
    }

    /**
     * Set challenge winner
     * Note: Does not change status to 'completed' - challenges remain 'active' until manually completed
     */
    static async setWinner(challengeId, winnerId) {
        return new Promise((resolve, reject) => {
            const query = `
        UPDATE challenges 
        SET winner_id = ?, status = 'completed', completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

            db.run(query, [winnerId, challengeId], function (err) {
                if (err) {
                    logger.error('Failed to set challenge winner', { error: err, challengeId, winnerId });
                    return reject(err);
                }
                resolve(this.changes > 0);
            });
        });
    }

    /**
     * Get or create challenge stats for user
     */
    static async getChallengeStats(userId) {
        return new Promise((resolve, reject) => {
            const query = `SELECT * FROM challenge_stats WHERE user_id = ?`;

            db.get(query, [userId], (err, row) => {
                if (err) {
                    logger.error('Failed to get challenge stats', { error: err, userId });
                    return reject(err);
                }

                if (row) {
                    resolve(row);
                } else {
                    // Create initial stats
                    const insertQuery = `INSERT INTO challenge_stats (user_id) VALUES (?)`;
                    db.run(insertQuery, [userId], function (err) {
                        if (err) {
                            logger.error('Failed to create challenge stats', { error: err, userId });
                            return reject(err);
                        }
                        resolve({
                            id: this.lastID,
                            user_id: userId,
                            total_challenges: 0,
                            challenges_won: 0,
                            challenges_lost: 0,
                            challenges_drawn: 0,
                            current_win_streak: 0,
                            best_win_streak: 0
                        });
                    });
                }
            });
        });
    }

    /**
     * Update challenge stats after a challenge completes
     */
    static async updateChallengeStats(userId, result) {
        return new Promise((resolve, reject) => {
            // First ensure stats exist
            this.getChallengeStats(userId).then(() => {
                let query;

                if (result === 'won') {
                    query = `
            UPDATE challenge_stats 
            SET total_challenges = total_challenges + 1,
                challenges_won = challenges_won + 1,
                current_win_streak = current_win_streak + 1,
                best_win_streak = MAX(best_win_streak, current_win_streak + 1)
            WHERE user_id = ?
          `;
                } else if (result === 'lost') {
                    query = `
            UPDATE challenge_stats 
            SET total_challenges = total_challenges + 1,
                challenges_lost = challenges_lost + 1,
                current_win_streak = 0
            WHERE user_id = ?
          `;
                } else if (result === 'drawn') {
                    query = `
            UPDATE challenge_stats 
            SET total_challenges = total_challenges + 1,
                challenges_drawn = challenges_drawn + 1
            WHERE user_id = ?
          `;
                }

                db.run(query, [userId], function (err) {
                    if (err) {
                        logger.error('Failed to update challenge stats', { error: err, userId, result });
                        return reject(err);
                    }
                    resolve(this.changes > 0);
                });
            }).catch(reject);
        });
    }

    /**
     * Get participants for a challenge
     */
    static async getChallengeParticipants(challengeId) {
        return new Promise((resolve, reject) => {
            const query = `
        SELECT cp.*, u.username
        FROM challenge_participants cp
        JOIN users u ON cp.user_id = u.id
        WHERE cp.challenge_id = ?
      `;

            db.all(query, [challengeId], (err, rows) => {
                if (err) {
                    logger.error('Failed to get challenge participants', { error: err, challengeId });
                    return reject(err);
                }
                resolve(rows || []);
            });
        });
    }

    /**
     * Delete a challenge (only if pending)
     */
    static async deleteChallenge(challengeId, userId, expectedVersion = null) {
        const ConcurrencyError = require('../utils/ConcurrencyError');

        // If version checking is enabled, validate version first
        if (expectedVersion !== null) {
            const currentChallenge = await this.getChallengeById(challengeId);
            if (!currentChallenge) {
                throw new Error('Challenge not found');
            }

            if (currentChallenge.version !== expectedVersion) {
                throw new ConcurrencyError(
                    `Challenge has been modified by another session. Expected version ${expectedVersion}, but current version is ${currentChallenge.version}.`,
                    'challenge',
                    expectedVersion,
                    currentChallenge.version
                );
            }
        }
        return new Promise((resolve, reject) => {
            // First check if user is creator or opponent and challenge is pending
            const checkQuery = `
        SELECT * FROM challenges 
        WHERE id = ? AND (creator_id = ? OR opponent_id = ?) AND status = 'pending'
      `;

            db.get(checkQuery, [challengeId, userId, userId], (err, row) => {
                if (err) {
                    logger.error('Failed to check challenge for deletion', { error: err, challengeId });
                    return reject(err);
                }

                if (!row) {
                    return reject(new Error('Challenge not found or cannot be deleted'));
                }

                // Delete participants first
                const deleteParticipants = `DELETE FROM challenge_participants WHERE challenge_id = ?`;
                db.run(deleteParticipants, [challengeId], (err) => {
                    if (err) {
                        logger.error('Failed to delete challenge participants', { error: err, challengeId });
                        return reject(err);
                    }

                    // Delete challenge
                    const deleteChallenge = `DELETE FROM challenges WHERE id = ?`;
                    db.run(deleteChallenge, [challengeId], function (err) {
                        if (err) {
                            logger.error('Failed to delete challenge', { error: err, challengeId });
                            return reject(err);
                        }
                        resolve(this.changes > 0);
                    });
                });
            });
        });
    }
}

module.exports = ChallengeRepository;
