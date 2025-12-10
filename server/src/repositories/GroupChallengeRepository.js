const db = require('../db');
const logger = require('../utils/logger');

class GroupChallengeRepository {
    // Generate a unique 6-character room code
    static generateRoomCode() {
        const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return code;
    }

    // Create a new group challenge room
    static async createRoom(quizId, leaderId, maxParticipants = 8) {
        return new Promise(async (resolve, reject) => {
            try {
                // Generate unique room code
                let roomCode;
                let isUnique = false;

                while (!isUnique) {
                    roomCode = this.generateRoomCode();
                    const existing = await new Promise((res, rej) => {
                        db.get('SELECT id FROM group_challenges WHERE room_code = ?', [roomCode], (err, row) => {
                            if (err) rej(err);
                            else res(row);
                        });
                    });
                    if (!existing) isUnique = true;
                }

                // Create the room
                db.run(
                    `INSERT INTO group_challenges (quiz_id, leader_id, room_code, max_participants, status)
           VALUES (?, ?, ?, ?, 'waiting')`,
                    [quizId, leaderId, roomCode, maxParticipants],
                    function (err) {
                        if (err) {
                            logger.error('Failed to create group challenge room', { error: err });
                            return reject(err);
                        }

                        const roomId = this.lastID;

                        // Automatically add leader as first participant
                        db.run(
                            `INSERT INTO group_challenge_participants (group_challenge_id, user_id, is_ready)
               VALUES (?, ?, 1)`,
                            [roomId, leaderId],
                            (err) => {
                                if (err) {
                                    logger.error('Failed to add leader to room', { error: err });
                                    return reject(err);
                                }

                                logger.info('Group challenge room created', { roomId, roomCode, leaderId });
                                resolve({ roomId, roomCode });
                            }
                        );
                    }
                );
            } catch (err) {
                reject(err);
            }
        });
    }

    // Get room by ID with full details
    static getRoomById(roomId) {
        return new Promise((resolve, reject) => {
            db.get(
                `SELECT 
          gc.*,
          q.title as quiz_title,
          q.category as quiz_category,
          q.difficulty as quiz_difficulty,
          u.username as leader_username
         FROM group_challenges gc
         JOIN quizzes q ON gc.quiz_id = q.id
         JOIN users u ON gc.leader_id = u.id
         WHERE gc.id = ?`,
                [roomId],
                async (err, room) => {
                    if (err) {
                        logger.error('Failed to get room by ID', { error: err, roomId });
                        return reject(err);
                    }

                    if (!room) {
                        return resolve(null);
                    }

                    // Get participants
                    const participants = await this.getRoomParticipants(roomId);
                    room.participants = participants;
                    room.participant_count = participants.length;

                    resolve(room);
                }
            );
        });
    }

    // Get room by room code
    static getRoomByCode(roomCode) {
        return new Promise((resolve, reject) => {
            db.get(
                `SELECT 
          gc.*,
          q.title as quiz_title,
          q.category as quiz_category,
          q.difficulty as quiz_difficulty,
          u.username as leader_username
         FROM group_challenges gc
         JOIN quizzes q ON gc.quiz_id = q.id
         JOIN users u ON gc.leader_id = u.id
         WHERE gc.room_code = ?`,
                [roomCode],
                async (err, room) => {
                    if (err) {
                        logger.error('Failed to get room by code', { error: err, roomCode });
                        return reject(err);
                    }

                    if (!room) {
                        return resolve(null);
                    }

                    // Get participants
                    const participants = await this.getRoomParticipants(room.id);
                    room.participants = participants;
                    room.participant_count = participants.length;

                    resolve(room);
                }
            );
        });
    }

    static getRoomParticipants(roomId) {
        return new Promise((resolve, reject) => {
            db.all(
                `SELECT 
          gcp.*,
          u.username,
          u.avatar_url,
          u.level
         FROM group_challenge_participants gcp
         JOIN users u ON gcp.user_id = u.id
         WHERE gcp.group_challenge_id = ?
        ORDER BY gcp.joined_at ASC`,
                [roomId],
                (err, rows) => {
                    if (err) {
                        logger.error('Failed to get room participants', { error: err, roomId });
                        return reject(err);
                    }
                    resolve(rows || []);
                }
            );
        });
    }

    // Join a room
    static joinRoom(roomId, userId) {
        return new Promise(async (resolve, reject) => {
            try {
                // Check if room exists
                const room = await this.getRoomById(roomId);

                if (!room) {
                    return reject(new Error('Room not found'));
                }

                // Check if user is already in the room (allow rejoining)
                const existing = room.participants.find(p => p.user_id === userId);
                if (existing) {
                    logger.info('User already in room, allowing rejoin', { roomId, userId });
                    return resolve(); // Allow rejoin
                }

                // Check capacity only for new participants
                if (room.status !== 'waiting') {
                    return reject(new Error('Room has already started'));
                }

                if (room.participant_count >= room.max_participants) {
                    return reject(new Error('Room is full'));
                }

                // Add participant
                db.run(
                    `INSERT INTO group_challenge_participants(group_challenge_id, user_id)
VALUES(?, ?)`,
                    [roomId, userId],
                    (err) => {
                        if (err) {
                            logger.error('Failed to join room', { error: err, roomId, userId });
                            return reject(err);
                        }

                        logger.info('User joined room', { roomId, userId });
                        resolve();
                    }
                );
            } catch (err) {
                reject(err);
            }
        });
    }

    // Leave a room
    static leaveRoom(roomId, userId) {
        return new Promise((resolve, reject) => {
            db.run(
                `DELETE FROM group_challenge_participants
         WHERE group_challenge_id = ? AND user_id = ? `,
                [roomId, userId],
                (err) => {
                    if (err) {
                        logger.error('Failed to leave room', { error: err, roomId, userId });
                        return reject(err);
                    }

                    logger.info('User left room', { roomId, userId });
                    resolve();
                }
            );
        });
    }

    // Update participant ready status
    static updateParticipantReady(roomId, userId, isReady) {
        return new Promise((resolve, reject) => {
            db.run(
                `UPDATE group_challenge_participants
         SET is_ready = ?
    WHERE group_challenge_id = ? AND user_id = ? `,
                [isReady ? 1 : 0, roomId, userId],
                (err) => {
                    if (err) {
                        logger.error('Failed to update ready status', { error: err, roomId, userId });
                        return reject(err);
                    }

                    logger.info('Participant ready status updated', { roomId, userId, isReady });
                    resolve();
                }
            );
        });
    }

    // Start challenge (update status to active)
    static startChallenge(roomId, expectedVersion = null) {
        return new Promise((resolve, reject) => {
            const query = expectedVersion !== null
                ? `UPDATE group_challenges 
           SET status = 'active', started_at = CURRENT_TIMESTAMP
           WHERE id = ? AND version = ? `
                : `UPDATE group_challenges 
           SET status = 'active', started_at = CURRENT_TIMESTAMP
           WHERE id = ? `;

            const params = expectedVersion !== null ? [roomId, expectedVersion] : [roomId];

            db.run(query, params, function (err) {
                if (err) {
                    logger.error('Failed to start challenge', { error: err, roomId });
                    return reject(err);
                }

                if (this.changes === 0 && expectedVersion !== null) {
                    return reject(new Error('Concurrency conflict: room was modified'));
                }

                logger.info('Challenge started', { roomId });
                resolve();
            });
        });
    }

    // Mark participant as completed and update final score
    static markParticipantComplete(roomId, userId, finalScore, totalTime) {
        return new Promise((resolve, reject) => {
            db.run(
                `UPDATE group_challenge_participants 
                 SET completed = 1,
    score = ?,
    total_time = ?,
    completed_at = CURRENT_TIMESTAMP
                 WHERE group_challenge_id = ? AND user_id = ? `,
                [finalScore, totalTime, roomId, userId],
                function (err) {
                    if (err) {
                        logger.error('Failed to mark participant complete', { error: err, roomId, userId });
                        return reject(err);
                    }
                    logger.info('Participant marked as complete', { roomId, userId, finalScore, totalTime });
                    resolve();
                }
            );
        });
    }

    // Update participant score
    static updateParticipantScore(roomId, userId, score, timeTaken) {
        return new Promise((resolve, reject) => {
            db.run(
                `UPDATE group_challenge_participants
         SET score = ?, total_time_seconds = ?
    WHERE group_challenge_id = ? AND user_id = ? `,
                [score, timeTaken, roomId, userId],
                (err) => {
                    if (err) {
                        logger.error('Failed to update participant score', { error: err, roomId, userId });
                        return reject(err);
                    }

                    logger.debug('Participant score updated', { roomId, userId, score, timeTaken });
                    resolve();
                }
            );
        });
    }

    // Mark participant as completed
    static markParticipantCompleted(roomId, userId) {
        return new Promise((resolve, reject) => {
            db.run(
                `UPDATE group_challenge_participants
         SET completed = 1, completed_at = CURRENT_TIMESTAMP
         WHERE group_challenge_id = ? AND user_id = ? `,
                [roomId, userId],
                (err) => {
                    if (err) {
                        logger.error('Failed to mark participant completed', { error: err, roomId, userId });
                        return reject(err);
                    }

                    logger.info('Participant marked as completed', { roomId, userId });
                    resolve();
                }
            );
        });
    }

    // Complete challenge and calculate rankings
    static async completeChallenge(roomId) {
        return new Promise(async (resolve, reject) => {
            try {
                // Get all participants with scores
                const participants = await this.getRoomParticipants(roomId);

                // Sort by score (desc), then by time (asc)
                participants.sort((a, b) => {
                    if (b.score !== a.score) return b.score - a.score;
                    return a.total_time_seconds - b.total_time_seconds;
                });

                // Assign ranks
                for (let i = 0; i < participants.length; i++) {
                    const rank = i + 1;
                    await new Promise((res, rej) => {
                        db.run(
                            `UPDATE group_challenge_participants
               SET rank = ?
    WHERE id = ? `,
                            [rank, participants[i].id],
                            (err) => {
                                if (err) rej(err);
                                else res();
                            }
                        );
                    });

                    // Update user stats
                    await this.updateUserStats(participants[i].user_id, rank, participants[i].score);
                }

                // Update room status to completed
                await new Promise((res, rej) => {
                    db.run(
                        `UPDATE group_challenges
             SET status = 'completed', completed_at = CURRENT_TIMESTAMP
             WHERE id = ? `,
                        [roomId],
                        (err) => {
                            if (err) rej(err);
                            else res();
                        }
                    );
                });

                logger.info('Challenge completed', { roomId, participantCount: participants.length });
                resolve(participants);
            } catch (err) {
                logger.error('Failed to complete challenge', { error: err, roomId });
                reject(err);
            }
        });
    }

    // Update user stats
    static updateUserStats(userId, rank, score) {
        return new Promise((resolve, reject) => {
            // Get or create stats
            db.get(
                'SELECT * FROM group_challenge_stats WHERE user_id = ?',
                [userId],
                (err, stats) => {
                    if (err) {
                        logger.error('Failed to get user stats', { error: err, userId });
                        return reject(err);
                    }

                    if (!stats) {
                        // Create new stats
                        db.run(
                            `INSERT INTO group_challenge_stats
    (user_id, total_group_challenges, first_place_finishes, second_place_finishes,
        third_place_finishes, best_rank, average_rank, total_score)
VALUES(?, 1, ?, ?, ?, ?, ?, ?)`,
                            [
                                userId,
                                rank === 1 ? 1 : 0,
                                rank === 2 ? 1 : 0,
                                rank === 3 ? 1 : 0,
                                rank,
                                rank,
                                score
                            ],
                            (err) => {
                                if (err) {
                                    logger.error('Failed to create user stats', { error: err, userId });
                                    return reject(err);
                                }
                                resolve();
                            }
                        );
                    } else {
                        // Update existing stats
                        const newTotal = stats.total_group_challenges + 1;
                        const newAvgRank = ((stats.average_rank || 0) * stats.total_group_challenges + rank) / newTotal;
                        const newBestRank = stats.best_rank ? Math.min(stats.best_rank, rank) : rank;

                        db.run(
                            `UPDATE group_challenge_stats
               SET total_group_challenges = ?,
    first_place_finishes = first_place_finishes + ?,
    second_place_finishes = second_place_finishes + ?,
    third_place_finishes = third_place_finishes + ?,
    best_rank = ?,
    average_rank = ?,
    total_score = total_score + ?,
    updated_at = CURRENT_TIMESTAMP
               WHERE user_id = ? `,
                            [
                                newTotal,
                                rank === 1 ? 1 : 0,
                                rank === 2 ? 1 : 0,
                                rank === 3 ? 1 : 0,
                                newBestRank,
                                newAvgRank,
                                score,
                                userId
                            ],
                            (err) => {
                                if (err) {
                                    logger.error('Failed to update user stats', { error: err, userId });
                                    return reject(err);
                                }
                                resolve();
                            }
                        );
                    }
                }
            );
        });
    }

    // Get user's rooms
    static getUserRooms(userId, filters = {}) {
        return new Promise((resolve, reject) => {
            let query = `
        SELECT DISTINCT
gc.*,
    q.title as quiz_title,
    q.category as quiz_category,
    q.difficulty as quiz_difficulty,
    u.username as leader_username,
    gcp.rank as my_rank,
    gcp.score as my_score
        FROM group_challenges gc
        JOIN quizzes q ON gc.quiz_id = q.id
        JOIN users u ON gc.leader_id = u.id
        JOIN group_challenge_participants gcp ON gc.id = gcp.group_challenge_id
        WHERE gcp.user_id = ?
    `;

            const params = [userId];

            if (filters.status) {
                if (Array.isArray(filters.status)) {
                    // Handle multiple statuses
                    const placeholders = filters.status.map(() => '?').join(',');
                    query += ` AND gc.status IN(${ placeholders })`;
                    params.push(...filters.status);
                } else {
                    // Single status
                    query += ' AND gc.status = ?';
                    params.push(filters.status);
                }
            }

            query += ' ORDER BY gc.created_at DESC';

            if (filters.limit) {
                query += ' LIMIT ?';
                params.push(filters.limit);
            }

            db.all(query, params, (err, rows) => {
                if (err) {
                    logger.error('Failed to get user rooms', { error: err, userId });
                    return reject(err);
                }
                resolve(rows || []);
            });
        });
    }

    // Get user stats
    static getUserStats(userId) {
        return new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM group_challenge_stats WHERE user_id = ?',
                [userId],
                (err, stats) => {
                    if (err) {
                        logger.error('Failed to get user stats', { error: err, userId });
                        return reject(err);
                    }

                    // Return default stats if none exist
                    if (!stats) {
                        resolve({
                            user_id: userId,
                            total_group_challenges: 0,
                            first_place_finishes: 0,
                            second_place_finishes: 0,
                            third_place_finishes: 0,
                            best_rank: null,
                            average_rank: null,
                            total_score: 0
                        });
                    } else {
                        resolve(stats);
                    }
                }
            );
        });
    }

    // Delete a room (only if waiting)
    static deleteRoom(roomId, userId) {
        return new Promise(async (resolve, reject) => {
            try {
                const room = await this.getRoomById(roomId);

                if (!room) {
                    return reject(new Error('Room not found'));
                }

                if (room.leader_id !== userId) {
                    return reject(new Error('Only the leader can delete the room'));
                }

                if (room.status !== 'waiting') {
                    return reject(new Error('Cannot delete a room that has started'));
                }

                db.run('DELETE FROM group_challenges WHERE id = ?', [roomId], (err) => {
                    if (err) {
                        logger.error('Failed to delete room', { error: err, roomId });
                        return reject(err);
                    }

                    logger.info('Room deleted', { roomId, userId });
                    resolve();
                });
            } catch (err) {
                reject(err);
            }
        });
    }
}

module.exports = GroupChallengeRepository;
