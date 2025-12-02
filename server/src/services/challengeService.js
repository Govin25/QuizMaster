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

        // Get opponent by username
        const db = require('../db');
        const opponent = await new Promise((resolve, reject) => {
            db.get('SELECT id, username FROM users WHERE username = ?', [opponentUsername], (err, row) => {
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

        return { quiz, opponent };
    }

    /**
     * Determine winner based on scores and time
     */
    static determineWinner(participant1, participant2) {
        // Higher score wins
        if (participant1.score > participant2.score) {
            return { winnerId: participant1.user_id, result: 'won' };
        } else if (participant2.score > participant1.score) {
            return { winnerId: participant2.user_id, result: 'won' };
        }

        // If scores are equal, faster time wins
        if (participant1.total_time_seconds < participant2.total_time_seconds) {
            return { winnerId: participant1.user_id, result: 'won' };
        } else if (participant2.total_time_seconds < participant1.total_time_seconds) {
            return { winnerId: participant2.user_id, result: 'won' };
        }

        // Perfect tie - both same score and time
        return { winnerId: null, result: 'drawn' };
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
                // Draw
                await ChallengeRepository.updateChallengeStatus(challengeId, 'completed');
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
