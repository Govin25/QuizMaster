const GroupChallengeRepository = require('../repositories/GroupChallengeRepository');
const Quiz = require('../models/Quiz');
const logger = require('../utils/logger');

class GroupChallengeService {
    // Validate room creation
    static async validateRoomCreation(quizId, leaderId) {
        // Check if quiz exists
        const quiz = await Quiz.getById(quizId);

        if (!quiz) {
            throw new Error('Quiz not found');
        }

        // Check if quiz has questions
        if (!quiz.questions || quiz.questions.length === 0) {
            throw new Error('Quiz must have at least one question');
        }

        return { quiz };
    }

    // Check if user can join room
    static async canJoinRoom(roomId, userId) {
        const room = await GroupChallengeRepository.getRoomById(roomId);

        if (!room) {
            throw new Error('Room not found');
        }

        // Check if user is already in the room
        const isParticipant = room.participants.some(p => p.user_id === userId);

        // If already a participant, allow rejoining even if active
        if (isParticipant) {
            return true;
        }

        // For new participants, check room state
        if (room.status !== 'waiting') {
            throw new Error('Room has already started');
        }

        if (room.participant_count >= room.max_participants) {
            throw new Error('Room is full');
        }

        return true;
    }

    // Check if challenge can start
    static async canStartChallenge(roomId, userId) {
        const room = await GroupChallengeRepository.getRoomById(roomId);

        if (!room) {
            throw new Error('Room not found');
        }

        if (room.leader_id !== userId) {
            throw new Error('Only the leader can start the challenge');
        }

        if (room.status !== 'waiting') {
            throw new Error('Challenge has already started');
        }

        // Check if all participants are ready
        const allReady = room.participants.every(p => p.is_ready);
        if (!allReady) {
            throw new Error('All participants must be ready before starting');
        }

        if (room.participant_count < 2) {
            throw new Error('At least 2 participants are required to start');
        }

        return { room, version: room.version };
    }

    // Process challenge completion
    static async processChallengeCompletion(roomId) {
        const room = await GroupChallengeRepository.getRoomById(roomId);

        if (!room) {
            throw new Error('Room not found');
        }

        // Check if all participants have completed
        const allCompleted = room.participants.every(p => p.completed);

        if (allCompleted) {
            // Complete the challenge and calculate rankings
            const rankedParticipants = await GroupChallengeRepository.completeChallenge(roomId);

            logger.info('Group challenge completed', {
                roomId,
                participantCount: rankedParticipants.length,
                winner: rankedParticipants[0]?.username
            });

            return {
                completed: true,
                participants: rankedParticipants,
                winner: rankedParticipants[0]
            };
        }

        return {
            completed: false,
            participants: room.participants
        };
    }

    // Force complete challenge (for auto-end)
    static async forceCompleteChallenge(roomId) {
        logger.info('Force completing group challenge', { roomId });

        // Mark all incomplete participants as completed
        const room = await GroupChallengeRepository.getRoomById(roomId);

        for (const participant of room.participants) {
            if (!participant.completed) {
                await GroupChallengeRepository.markParticipantCompleted(roomId, participant.user_id);
            }
        }

        // Complete the challenge
        return await this.processChallengeCompletion(roomId);
    }

    // Get live leaderboard
    static async getLiveLeaderboard(roomId) {
        const participants = await GroupChallengeRepository.getRoomParticipants(roomId);

        // Sort by score (desc), then by time (asc)
        const sorted = participants.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.total_time_seconds - b.total_time_seconds;
        });

        // Add temporary ranks
        return sorted.map((p, index) => ({
            ...p,
            current_rank: index + 1
        }));
    }
}

module.exports = GroupChallengeService;
