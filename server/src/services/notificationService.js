const db = require('../db');
const logger = require('../utils/logger');

class NotificationService {
    /**
     * Create a new notification and emit it via socket
     */
    static async createNotification(userId, type, title, message, data = null, io = null) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO notifications (user_id, type, title, message, data)
                VALUES (?, ?, ?, ?, ?)
            `;

            const dataString = data ? JSON.stringify(data) : null;

            db.run(query, [userId, type, title, message, dataString], function (err) {
                if (err) {
                    logger.error('Failed to create notification', { error: err, userId, type });
                    return reject(err);
                }

                const notificationId = this.lastID;
                const notification = {
                    id: notificationId,
                    user_id: userId,
                    type,
                    title,
                    message,
                    data,
                    is_read: false,
                    created_at: new Date().toISOString()
                };

                // Emit real-time notification if IO is provided
                if (io) {
                    // Targeted emission to specific user room
                    io.to(`user_${userId}`).emit('notification_received', notification);
                    logger.debug('Emitted notification', { userId, type, notificationId });
                }

                resolve(notification);
            });
        });
    }

    /**
     * Get notifications for a user
     */
    static async getUserNotifications(userId, limit = 20, offset = 0) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT * FROM notifications 
                WHERE user_id = ? 
                ORDER BY created_at DESC 
                LIMIT ? OFFSET ?
            `;

            db.all(query, [userId, limit, offset], (err, rows) => {
                if (err) {
                    logger.error('Failed to get user notifications', { error: err, userId });
                    return reject(err);
                }

                // Parse JSON data
                const notifications = rows.map(row => ({
                    ...row,
                    is_read: !!row.is_read, // sqlite stores boolean as int
                    data: row.data ? JSON.parse(row.data) : null
                }));

                resolve(notifications);
            });
        });
    }

    /**
     * Get unread count
     */
    static async getUnreadCount(userId) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT COUNT(*) as count FROM notifications 
                WHERE user_id = ? AND is_read = 0
            `;

            db.get(query, [userId], (err, row) => {
                if (err) {
                    logger.error('Failed to get unread count', { error: err, userId });
                    return reject(err);
                }
                resolve(row ? row.count : 0);
            });
        });
    }

    /**
     * Mark notification as read
     */
    static async markAsRead(notificationId, userId) {
        return new Promise((resolve, reject) => {
            const query = `
                UPDATE notifications 
                SET is_read = 1 
                WHERE id = ? AND user_id = ?
            `;

            db.run(query, [notificationId, userId], function (err) {
                if (err) {
                    logger.error('Failed to mark notification as read', { error: err, notificationId });
                    return reject(err);
                }
                resolve(this.changes > 0);
            });
        });
    }

    /**
     * Delete all notifications for a user
     */
    static async deleteAllByUser(userId) {
        return new Promise((resolve, reject) => {
            const query = `
                DELETE FROM notifications 
                WHERE user_id = ?
            `;

            db.run(query, [userId], function (err) {
                if (err) {
                    logger.error('Failed to delete all notifications', { error: err, userId });
                    return reject(err);
                }
                resolve(this.changes);
            });
        });
    }

    /**
     * Mark all notifications as read for a user
     */
    static async markAllAsRead(userId) {
        return new Promise((resolve, reject) => {
            const query = `
                UPDATE notifications 
                SET is_read = 1 
                WHERE user_id = ? AND is_read = 0
            `;

            db.run(query, [userId], function (err) {
                if (err) {
                    logger.error('Failed to mark all notifications as read', { error: err, userId });
                    return reject(err);
                }
                resolve(this.changes);
            });
        });
    }
}

module.exports = NotificationService;
