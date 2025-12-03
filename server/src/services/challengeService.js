const ChallengeRepository = require('../repositories/ChallengeRepository');
const Quiz = require('../models/Quiz');
const logger = require('../utils/logger');

class ChallengeService {
    /**
     * Validate challenge creation
     */
    static async validateChallengeCreation(quizId, creatorId, opponentUsername) {
        // Check if quiz exists and is accessible
        const quiz = await Quiz.getById(quizId);
        if (!quiz) {
            throw new Error('Quiz not found');
        }

        // Check if quiz has questions
        if (!quiz.questions || quiz.questions.length === 0) {
            throw new Error('Quiz must have at least one question');
        }


        const db = require('../db');

        // Get opponent by username
        const opponent = await new Promise((resolve, reject) => {
            db.get('SELECT id, username, role FROM users WHERE username = ?', [opponentUsername], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!opponent) {
            throw new Error('Opponent user not found');
        }

        if (opponent.id === creatorId) {
            throw new Error('You cannot challenge yourself');
        }

        // Get creator's role
        const creator = await new Promise((resolve, reject) => {
            db.get('SELECT role FROM users WHERE id = ?', [creatorId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        // Prevent normal users from challenging admin users
        if (creator && creator.role !== 'admin' && opponent.role === 'admin') {
            throw new Error('You cannot challenge admin users');
        }

        // Check for existing active challenge with same quiz and opponent
        const existingChallenge = await new Promise((resolve, reject) => {
            db.get(
                `SELECT id FROM challenges 
                 WHERE quiz_id = ? 
                 AND ((creator_id = ? AND opponent_id = ?) OR (creator_id = ? AND opponent_id = ?))
                 AND status IN ('pending', 'active')
                 LIMIT 1`,
                [quizId, creatorId, opponent.id, opponent.id, creatorId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        if (existingChallenge) {
            throw new Error('An active challenge already exists for this quiz with this opponent');
        }

        return { quiz, opponent };
    }

    /**
     * Determine winner based on scores and time
     */
    static determineWinner(participant1, participant2) {
        logger.debug('Determining challenge winner', {
            participant1: {
                userId: participant1.user_id,
                username: participant1.username,
                score: participant1.score,
                time: participant1.total_time_seconds
            },
            participant2: {
                userId: participant2.user_id,
                username: participant2.username,
                score: participant2.score,
                time: participant2.total_time_seconds
            }
        });

        // Explicitly convert to numbers to ensure proper comparison
        const score1 = Number(participant1.score) || 0;
        const score2 = Number(participant2.score) || 0;
        const time1 = Number(participant1.total_time_seconds) || 0;
        const time2 = Number(participant2.total_time_seconds) || 0;

        // Higher score wins
        if (score1 > score2) {
            logger.info('Winner determined by score', {
                winnerId: participant1.user_id,
                winnerScore: score1,
                loserScore: score2
            });
            return { winnerId: participant1.user_id, result: 'won', reason: 'higher_score' };
        } else if (score2 > score1) {
            logger.info('Winner determined by score', {
                winnerId: participant2.user_id,
                winnerScore: score2,
                loserScore: score1
            });
            return { winnerId: participant2.user_id, result: 'won', reason: 'higher_score' };
        }

        // Scores are equal - check time as tiebreaker
        // Lower time (faster) wins
        if (time1 < time2 && time1 > 0) {
            logger.info('Winner determined by time (tiebreaker)', {
                winnerId: participant1.user_id,
                winnerTime: time1,
                loserTime: time2,
                equalScore: score1
            });
            return { winnerId: participant1.user_id, result: 'won', reason: 'faster_time' };
        } else if (time2 < time1 && time2 > 0) {
            logger.info('Winner determined by time (tiebreaker)', {
                winnerId: participant2.user_id,
                winnerTime: time2,
                loserTime: time1,
                equalScore: score2
            });
            return { winnerId: participant2.user_id, result: 'won', reason: 'faster_time' };
        }

        // Perfect tie - both same score and time (or both have 0 time)
        logger.info('Challenge resulted in a draw', {
            score: score1,
            time1,
            time2
        });
        return { winnerId: null, result: 'drawn', reason: 'perfect_tie' };
    }

    /**
     * Process challenge completion
     */
    static async processChallengeCompletion(challengeId) {
        try {
            // Get all participants
            const participants = await ChallengeRepository.getChallengeParticipants(challengeId);

            // Check if both completed
            const allCompleted = participants.every(p => p.completed);

            if (!allCompleted) {
                return { completed: false };
            }

            // Determine winner
            const [participant1, participant2] = participants;
            const { winnerId, result } = this.determineWinner(participant1, participant2);

            // Update challenge with winner
            if (winnerId) {
                await ChallengeRepository.setWinner(challengeId, winnerId);

                // Update stats for both users
                const loserId = winnerId === participant1.user_id ? participant2.user_id : participant1.user_id;
                await ChallengeRepository.updateChallengeStats(winnerId, 'won');
                await ChallengeRepository.updateChallengeStats(loserId, 'lost');
            } else {
                // Draw - set status to completed
                await ChallengeRepository.updateChallengeStatus(challengeId, 'completed', { completed_at: new Date().toISOString() });
                await ChallengeRepository.updateChallengeStats(participant1.user_id, 'drawn');
                await ChallengeRepository.updateChallengeStats(participant2.user_id, 'drawn');
            }

            logger.info('Challenge completed', { challengeId, winnerId, result });

            return {
                completed: true,
                winnerId,
                result,
                participants: participants.map(p => ({
                    userId: p.user_id,
                    username: p.username,
                    score: p.score,
                    time: p.total_time_seconds
                }))
            };
        } catch (error) {
            logger.error('Failed to process challenge completion', { error, challengeId });
            throw error;
        }
    }

    /**
     * Get challenge summary for notifications
     */
    static async getChallengeSummary(challengeId) {
        const challenge = await ChallengeRepository.getChallengeById(challengeId);
        if (!challenge) {
            return null;
        }

        return {
            id: challenge.id,
            quizTitle: challenge.quiz_title,
            quizCategory: challenge.quiz_category,
            quizDifficulty: challenge.quiz_difficulty,
            creatorUsername: challenge.creator_username,
            opponentUsername: challenge.opponent_username,
            status: challenge.status,
            createdAt: challenge.created_at
        };
    }

    /**
     * Calculate XP and rewards for challenge completion
     */
    static calculateChallengeRewards(won, score, opponentScore) {
        let xp = 0;

        if (won) {
            xp = 50; // Base XP for winning

            // Bonus for score difference
            const scoreDiff = score - opponentScore;
            if (scoreDiff > 50) {
                xp += 25; // Dominant victory
            } else if (scoreDiff > 20) {
                xp += 15; // Solid victory
            } else {
                xp += 10; // Close victory
            }
        } else {
            xp = 10; // Participation XP
        }

        return { xp };
    }
}

module.exports = ChallengeService;
