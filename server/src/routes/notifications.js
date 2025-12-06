const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const NotificationService = require('../services/notificationService');
const logger = require('../utils/logger');
const { handleError } = require('../utils/errorHandler');

// Get user notifications
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;

        logger.info('🔔 GET /notifications request', { userId, limit, offset });

        const notifications = await NotificationService.getUserNotifications(userId, limit, offset);
        const unreadCount = await NotificationService.getUnreadCount(userId);

        logger.info('🔔 Finding notifications', { userId, count: notifications.length });

        res.json({ notifications, unreadCount });
    } catch (err) {
        logger.error('Failed to get notifications', {
            error: err,
            context: { userId: req.user.id },
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

// Mark single notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const notificationId = req.params.id;

        const success = await NotificationService.markAsRead(notificationId, userId);

        if (!success) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json({ message: 'Marked as read' });
    } catch (err) {
        logger.error('Failed to mark notification as read', {
            error: err,
            context: { userId: req.user.id, notificationId: req.params.id },
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

// Mark all as read
router.put('/read-all', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const count = await NotificationService.markAllAsRead(userId);

        res.json({ message: 'All notifications marked as read', count });
    } catch (err) {
        logger.error('Failed to mark all notifications as read', {
            error: err,
            context: { userId: req.user.id },
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});
// Delete all notifications
router.delete('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const count = await NotificationService.deleteAllByUser(userId);

        res.json({ message: 'All notifications deleted', count });
    } catch (err) {
        logger.error('Failed to delete all notifications', {
            error: err,
            context: { userId: req.user.id },
            requestId: req.requestId
        });
        res.status(500).json(handleError(err, { userId: req.user?.id, requestId: req.requestId }));
    }
});

module.exports = router;
