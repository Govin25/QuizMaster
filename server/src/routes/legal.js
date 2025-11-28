const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const authMiddleware = require('../middleware/authMiddleware');
const dataExportService = require('../services/dataExport');
const accountDeletionService = require('../services/accountDeletion');
const { User } = require('../models/sequelize');

/**
 * GET /api/legal/privacy-policy
 * Serve privacy policy content
 */
router.get('/privacy-policy', async (req, res) => {
    try {
        const privacyPath = path.join(__dirname, '../../../PRIVACY_POLICY.md');
        const content = await fs.readFile(privacyPath, 'utf-8');
        res.json({ content });
    } catch (error) {
        console.error('Error reading privacy policy:', error);
        res.status(500).json({ error: 'Failed to load privacy policy' });
    }
});

/**
 * GET /api/legal/terms-of-service
 * Serve terms of service content
 */
router.get('/terms-of-service', async (req, res) => {
    try {
        const termsPath = path.join(__dirname, '../../../TERMS_OF_SERVICE.md');
        const content = await fs.readFile(termsPath, 'utf-8');
        res.json({ content });
    } catch (error) {
        console.error('Error reading terms of service:', error);
        res.status(500).json({ error: 'Failed to load terms of service' });
    }
});

/**
 * POST /api/legal/accept-terms
 * Record user acceptance of updated terms
 * Protected route - requires authentication
 */
router.post('/accept-terms', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { acceptTerms, acceptPrivacy } = req.body;

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const now = new Date();

        if (acceptTerms) {
            user.terms_accepted_at = now;
        }

        if (acceptPrivacy) {
            user.privacy_accepted_at = now;
        }

        await user.save();

        res.json({
            message: 'Terms acceptance recorded',
            terms_accepted_at: user.terms_accepted_at,
            privacy_accepted_at: user.privacy_accepted_at
        });
    } catch (error) {
        console.error('Accept terms error:', error);
        res.status(500).json({ error: 'Failed to record terms acceptance' });
    }
});

/**
 * GET /api/user/data-export
 * GDPR data export endpoint - returns all user data in JSON format
 * Protected route - requires authentication
 */
router.get('/user/data-export', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const dataExport = await dataExportService.exportUserData(userId);

        // Set headers for file download with formatted JSON
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="quizmaster-data-${userId}-${Date.now()}.json"`);

        // Send formatted JSON with 2-space indentation for readability
        res.send(JSON.stringify(dataExport, null, 2));
    } catch (error) {
        console.error('Data export error:', error);
        res.status(500).json({ error: 'Failed to export user data' });
    }
});

/**
 * POST /api/user/request-deletion
 * GDPR account deletion request - initiates 30-day grace period
 * Protected route - requires authentication
 */
router.post('/user/request-deletion', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await accountDeletionService.requestAccountDeletion(userId);
        res.json(result);
    } catch (error) {
        console.error('Deletion request error:', error);
        res.status(500).json({ error: 'Failed to request account deletion' });
    }
});

/**
 * POST /api/user/cancel-deletion
 * Cancel pending account deletion request
 * Protected route - requires authentication
 */
router.post('/user/cancel-deletion', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await accountDeletionService.cancelDeletionRequest(userId);
        res.json(result);
    } catch (error) {
        console.error('Cancel deletion error:', error);
        res.status(500).json({ error: 'Failed to cancel deletion request' });
    }
});

/**
 * DELETE /api/user/account
 * Permanent account deletion (after grace period or immediate with confirmation)
 * Protected route - requires authentication
 */
router.delete('/user/account', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { confirmDeletion, immediate } = req.body;

        if (!confirmDeletion) {
            return res.status(400).json({ error: 'Deletion confirmation required' });
        }

        // Check if deletion is due (grace period passed)
        const isDue = await accountDeletionService.isDeletionDue(userId);

        if (!immediate && !isDue) {
            return res.status(400).json({
                error: 'Grace period has not passed. Use immediate flag to delete now.'
            });
        }

        const result = await accountDeletionService.permanentlyDeleteAccount(userId, true);
        res.json(result);
    } catch (error) {
        console.error('Account deletion error:', error);
        res.status(500).json({ error: 'Failed to delete account' });
    }
});

/**
 * GET /api/user/deletion-status
 * Check if user has pending deletion request
 * Protected route - requires authentication
 */
router.get('/user/deletion-status', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findByPk(userId, {
            attributes: ['account_deletion_requested_at']
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const hasPendingDeletion = !!user.account_deletion_requested_at;
        const deletionDate = hasPendingDeletion
            ? new Date(user.account_deletion_requested_at.getTime() + 30 * 24 * 60 * 60 * 1000)
            : null;

        res.json({
            hasPendingDeletion,
            requestedAt: user.account_deletion_requested_at,
            deletionDate,
            daysRemaining: deletionDate
                ? Math.ceil((deletionDate - new Date()) / (24 * 60 * 60 * 1000))
                : null
        });
    } catch (error) {
        console.error('Deletion status error:', error);
        res.status(500).json({ error: 'Failed to check deletion status' });
    }
});

module.exports = router;
