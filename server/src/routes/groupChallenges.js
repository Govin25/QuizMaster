const express = require('express');
const router = express.Router();
const { authenticateToken, requirePermission } = require('../middleware/authMiddleware');
const GroupChallengeRepository = require('../repositories/GroupChallengeRepository');
const GroupChallengeService = require('../services/groupChallengeService');
const NotificationService = require('../services/notificationService');
const logger = require('../utils/logger');
const { handleError } = require('../utils/errorHandler');

// Max game duration - 10 minutes (600000ms)
const MAX_GAME_DURATION_MS = 10 * 60 * 1000;
// Track game timeout timers for rooms
const gameTimeoutTimers = new Map(); // roomId -> timeoutId

// Create a new group challenge room
router.post('/create', authenticateToken, requirePermission('challenge:create'), async (req, res) => {
    try {
        const { quizId, maxParticipants = 8 } = req.body;
        const leaderId = req.user.id;

        // Validate input
        if (!quizId) {
            return res.status(400).json({ error: 'Quiz ID is required' });
        }

        if (maxParticipants < 2 || maxParticipants > 8) {
            return res.status(400).json({ error: 'Max participants must be between 2 and 8' });
        }

        // Validate room creation
        const { quiz } = await GroupChallengeService.validateRoomCreation(quizId, leaderId);

        // Create room
        const { roomId, roomCode } = await GroupChallengeRepository.createRoom(
            quizId,
            leaderId,
            maxParticipants
        );

        logger.info('Group challenge room created', {
            roomId,
            roomCode,
            quizId,
            leaderId,
            requestId: req.requestId
        });

        // Get full room details
        const room = await GroupChallengeRepository.getRoomById(roomId);

        res.status(201).json({
            message: 'Room created successfully',
            room
        });
    } catch (err) {
        logger.error('Failed to create group challenge room', {
            error: err,
            context: { userId: req.user.id, body: req.body },
            requestId: req.requestId
        });
        res.status(400).json({ error: err.message });
    }
});

// Join room by ID
router.post('/:id/join', authenticateToken, async (req, res) => {
    try {
        const roomId = parseInt(req.params.id);
        const userId = req.user.id;

        // Validate join
        await GroupChallengeService.canJoinRoom(roomId, userId);

        // Join room
        await GroupChallengeRepository.joinRoom(roomId, userId);

        logger.info('User joined group challenge room', {
            roomId,
            userId,
            requestId: req.requestId
        });

        // Get updated room details
        const room = await GroupChallengeRepository.getRoomById(roomId);

        // Notify room via socket
        const io = req.app.get('io');
        if (io) {
            io.to(`group_challenge_${roomId}`).emit('participant_joined', {
                roomId,
                participant: room.participants.find(p => p.user_id === userId),
                participantCount: room.participant_count
            });
        }

        res.json({
            message: 'Joined room successfully',
            room
        });
    } catch (err) {
        logger.error('Failed to join group challenge room', {
            error: err,
            context: { roomId: req.params.id, userId: req.user.id },
            requestId: req.requestId
        });
        res.status(400).json({ error: err.message });
    }
});

// Join room by code
router.post('/join-code', authenticateToken, async (req, res) => {
    try {
        const { roomCode } = req.body;
        const userId = req.user.id;

        if (!roomCode) {
            return res.status(400).json({ error: 'Room code is required' });
        }

        // Get room by code
        const room = await GroupChallengeRepository.getRoomByCode(roomCode.toUpperCase());

        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        // Validate join
        await GroupChallengeService.canJoinRoom(room.id, userId);

        // Join room
        await GroupChallengeRepository.joinRoom(room.id, userId);

        logger.info('User joined group challenge room via code', {
            roomId: room.id,
            roomCode,
            userId,
            requestId: req.requestId
        });

        // Get updated room details
        const updatedRoom = await GroupChallengeRepository.getRoomById(room.id);

        // Notify room via socket
        const io = req.app.get('io');
        if (io) {
            io.to(`group_challenge_${room.id}`).emit('participant_joined', {
                roomId: room.id,
                participant: updatedRoom.participants.find(p => p.user_id === userId),
                participantCount: updatedRoom.participant_count
            });
        }

        res.json({
            message: 'Joined room successfully',
            room: updatedRoom
        });
    } catch (err) {
        logger.error('Failed to join group challenge room via code', {
            error: err,
            context: { roomCode: req.body.roomCode, userId: req.user.id },
            requestId: req.requestId
        });
        res.status(400).json({ error: err.message });
    }
});

// Leave room
router.post('/:id/leave', authenticateToken, async (req, res) => {
    try {
        const roomId = parseInt(req.params.id);
        const userId = req.user.id;

        await GroupChallengeRepository.leaveRoom(roomId, userId);

        logger.info('User left group challenge room', {
            roomId,
            userId,
            requestId: req.requestId
        });

        // Get updated room details
        const room = await GroupChallengeRepository.getRoomById(roomId);

        // Notify room via socket
        const io = req.app.get('io');
        if (io) {
            io.to(`group_challenge_${roomId}`).emit('participant_left', {
                roomId,
                userId,
                username: req.user.username,
                participantCount: room ? room.participant_count : 0
            });
        }

        res.json({ message: 'Left room successfully' });
    } catch (err) {
        logger.error('Failed to leave group challenge room', {
            error: err,
            context: { roomId: req.params.id, userId: req.user.id },
            requestId: req.requestId
        });
        res.status(400).json({ error: err.message });
    }
});

// Toggle ready status
router.post('/:id/ready', authenticateToken, async (req, res) => {
    try {
        const roomId = parseInt(req.params.id);
        const userId = req.user.id;
        const { isReady } = req.body;

        await GroupChallengeRepository.updateParticipantReady(roomId, userId, isReady);

        logger.info('Participant ready status updated', {
            roomId,
            userId,
            isReady,
            requestId: req.requestId
        });

        // Get updated room details
        const room = await GroupChallengeRepository.getRoomById(roomId);
        const participant = room.participants.find(p => p.user_id === userId);

        // Check if all ready
        const allReady = room.participants.every(p => p.is_ready);

        // Notify room via socket
        const io = req.app.get('io');
        if (io) {
            io.to(`group_challenge_${roomId}`).emit('participant_ready_status', {
                roomId,
                userId,
                username: req.user.username,
                isReady,
                allReady
            });
        }

        res.json({
            message: 'Ready status updated',
            allReady
        });
    } catch (err) {
        logger.error('Failed to update ready status', {
            error: err,
            context: { roomId: req.params.id, userId: req.user.id },
            requestId: req.requestId
        });
        res.status(400).json({ error: err.message });
    }
});

// Start challenge (leader only)
router.post('/:id/start', authenticateToken, async (req, res) => {
    try {
        const roomId = parseInt(req.params.id);
        const userId = req.user.id;

        // Validate start conditions
        const { room, version } = await GroupChallengeService.canStartChallenge(roomId, userId);

        // Start challenge
        await GroupChallengeRepository.startChallenge(roomId, version);

        logger.info('Group challenge started', {
            roomId,
            userId,
            participantCount: room.participant_count,
            requestId: req.requestId
        });

        // Notify room via socket
        const io = req.app.get('io');
        if (io) {
            io.to(`group_challenge_${roomId}`).emit('challenge_starting', {
                roomId,
                countdown: 3
            });

            // Start countdown
            setTimeout(() => {
                io.to(`group_challenge_${roomId}`).emit('group_challenge_start', {
                    roomId
                });
            }, 3000);

            // Start max game duration timer (10 minutes)
            // This ensures the game ends even if players crash/disconnect
            const gameTimeoutId = setTimeout(async () => {
                try {
                    logger.info('Max game duration reached, force completing challenge', {
                        roomId,
                        maxDurationMs: MAX_GAME_DURATION_MS
                    });

                    // Check if challenge is still active
                    const currentRoom = await GroupChallengeRepository.getRoomById(roomId);
                    if (currentRoom && currentRoom.status === 'active') {
                        // Force complete with current scores
                        const result = await GroupChallengeService.forceCompleteChallenge(roomId);

                        io.to(`group_challenge_${roomId}`).emit('group_challenge_finished', {
                            participants: result.participants,
                            winner: result.winner,
                            reason: 'max_duration_reached'
                        });
                    }

                    // Clean up timer
                    gameTimeoutTimers.delete(roomId);
                } catch (err) {
                    logger.error('Failed to force complete challenge on timeout', {
                        error: err,
                        roomId
                    });
                }
            }, MAX_GAME_DURATION_MS);

            // Store timer so we can cancel it if challenge ends normally
            gameTimeoutTimers.set(roomId, gameTimeoutId);
        }

        res.json({ message: 'Challenge starting' });
    } catch (err) {
        logger.error('Failed to start group challenge', {
            error: err,
            context: { roomId: req.params.id, userId: req.user.id },
            requestId: req.requestId
        });
        res.status(400).json({ error: err.message });
    }
});

// Get user's rooms - MUST be before /:id route
router.get('/my-rooms', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { status, limit } = req.query;

        const filters = {};
        if (status) {
            // Handle comma-separated status values
            const statuses = status.split(',');
            filters.status = statuses.length === 1 ? statuses[0] : statuses;
        }
        if (limit) filters.limit = parseInt(limit);

        const rooms = await GroupChallengeRepository.getUserRooms(userId, filters);

        res.json({ rooms });
    } catch (err) {
        logger.error('Failed to get user rooms', {
            error: err,
            context: { userId: req.user.id },
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

// Get room details
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const roomId = parseInt(req.params.id);
        const room = await GroupChallengeRepository.getRoomById(roomId);

        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        // Verify user is part of this room
        const isParticipant = room.participants.some(p => p.user_id === req.user.id);
        if (!isParticipant) {
            return res.status(403).json({ error: 'Not authorized to view this room' });
        }

        res.json({ room });
    } catch (err) {
        logger.error('Failed to get room details', {
            error: err,
            context: { roomId: req.params.id, userId: req.user.id },
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

// Get user's rooms
router.get('/my-rooms', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { status, limit } = req.query;

        const filters = {};
        if (status) filters.status = status;
        if (limit) filters.limit = parseInt(limit);

        const rooms = await GroupChallengeRepository.getUserRooms(userId, filters);

        res.json({ rooms });
    } catch (err) {
        logger.error('Failed to get user rooms', {
            error: err,
            context: { userId: req.user.id },
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

// Get user stats
router.get('/stats/:userId', authenticateToken, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);

        // Users can view their own stats or any user's stats (public)
        const stats = await GroupChallengeRepository.getUserStats(userId);

        res.json({ stats });
    } catch (err) {
        logger.error('Failed to get user stats', {
            error: err,
            context: { userId: req.params.userId },
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

// Delete room (leader only, waiting status only)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const roomId = parseInt(req.params.id);
        const userId = req.user.id;

        await GroupChallengeRepository.deleteRoom(roomId, userId);

        logger.info('Group challenge room deleted', {
            roomId,
            userId,
            requestId: req.requestId
        });

        // Notify room via socket
        const io = req.app.get('io');
        if (io) {
            io.to(`group_challenge_${roomId}`).emit('room_deleted', {
                roomId
            });
        }

        res.json({ message: 'Room deleted successfully' });
    } catch (err) {
        logger.error('Failed to delete room', {
            error: err,
            context: { roomId: req.params.id, userId: req.user.id },
            requestId: req.requestId
        });
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
module.exports.gameTimeoutTimers = gameTimeoutTimers;
